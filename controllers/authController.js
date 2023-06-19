const passport = require("passport");
const bcryptjs = require("bcryptjs");
const nodemailer = require("nodemailer");
// var kue = require('kue');
const { google } = require("googleapis");
const OAuth2 = google.auth.OAuth2;
const jwt = require("jsonwebtoken");
const JWT_KEY = "secretkey0025";
const JWT_RESET_KEY = "resetkey0025";

// ------------------Google Config----------------------------------//
const config={
  clientId: '753572344435-jo8nl5cfuoplh6cb44jk4r80eq5ne3jh.apps.googleusercontent.com',
  clientSecret: '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',
  refreshToken: '1//04vmSc2QiWaFrCgYIARAAGAQSNwF-L9IrBUxV9DF7dDsvkjh-Q9CfU08E3C-34qPeXovOhfiXw2hoBLL_tNPQUCq1sdLb-KoivV8',
  redirectURL: 'https://developers.google.com/oauthplayground'
}

// ------------Creating a que for processing parallel jobs -----------//
// var jobsQueue = kue.createQueue();

//------------ User Model ------------//
const User = require("../models/User");

//------------ Register Handle ------------//
exports.registerHandle = async (req, res) => {
  const { name, email, password, password2 } = req.body;
  let errors = [];

  //------------ Checking required fields ------------//
  if (!name || !email || !password || !password2) {
    errors.push({ msg: "Please enter all fields" });
  }

  //------------ Checking password mismatch ------------//
  if (password != password2) {
    errors.push({ msg: "Passwords do not match" });
  }

  //------------ Checking password length ------------//
  if (password.length < 8) {
    errors.push({ msg: "Password must be at least 8 characters" });
  }

  if (errors.length > 0) {
    res.render("register", {
      errors,
      name,
      email,
      password,
      password2,
    });
  } else {
    //------------ Validation passed ------------//
    let user = await User.findOne({ email: email });

    if (user) {
      //------------ User already exists ------------//
      errors.push({ msg: "Email ID already registered" });
      res.render("register", {
        errors,
        name,
        email,
        password,
        password2,
      });
    } else {
    const oauth2Client = new OAuth2(config.clientId, config.clientSecret, config.redirectURL);

    oauth2Client.setCredentials({
      refresh_token: config.refreshToken
    });
    const accessToken = oauth2Client.getAccessToken();

    const token = jwt.sign({ name, email, password }, JWT_KEY, {
      expiresIn: "30m",
    });
    const CLIENT_URL = "http://" + req.headers.host;

    const output = `
            <h2>Please click on below link to activate your account</h2>
            <p>${CLIENT_URL}/auth/activate/${token}</p>
            <p><b>NOTE: </b> The above activation link expires in 30 minutes.</p>
            `;

      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          type: "OAuth2",
          user: "msrinivas0025@gmail.com",
          clientId: config.clientId,
          clientSecret: config.clientSecret,
          refreshToken: config.refreshToken,
          accessToken: accessToken,
        },
      });

      // send mail with defined transport object
      const mailOptions = {
        from: '"Auth Admin" <msrinivas0025@gmail.com>', // sender address
        to: email, // list of receivers
        subject: "Account Verification: NodeJS Auth ✔", // Subject line
        generateTextFromHTML: true,
        html: output, // html body
      };

      transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
          console.log(error);
          req.flash(
            "error_msg",
            "Something went wrong on our end. Please register again."
          );
          res.redirect("/auth/login");
        } else {
          console.log("Mail sent : %s", info.response);
          req.flash(
            "success_msg",
            "Activation link sent to email ID. Please activate to log in."
          );
          res.redirect("/auth/login");
        }
      });
      // creating new job queue.
      // let newJob = jobsQueue.create("emailRegistration", mailOptions).save(function (err) {
      //       if (err) {
      //         console.log("Error in sending to the queue", err);
      //         return;
      //       }
      //       console.log("Job Enqueued", newJob.id);
      //       }).priority('high');
      // Processing the job queue request.
      // jobsQueue.process('emailRegistration', function(job, done){
      //   console.log('Email worker is processing a job', job.data);
      //   transporter.sendMail(job.data, (error, info) => {
      //     if (error) {
      //       console.log(error);
      //       req.flash(
      //         "error_msg",
      //         "Something went wrong on our end. Please register again."
      //       );
      //       res.redirect("/auth/login");
      //     } else {
      //       console.log("Mail sent : %s", info.response);
      //       req.flash(
      //         "success_msg",
      //         "Activation link sent to email ID. Please activate to log in."
      //       );
      //       res.redirect("/auth/login");
      //     }
      //   });
      //   done();
      // });
    }
  }
};

//------------ Activate Account Handle ------------//
exports.activateHandle = (req, res) => {
  const token = req.params.token;
  let errors = [];
  if (token) {
    jwt.verify(token, JWT_KEY, (err, decodedToken) => {
      if (err) {
        req.flash(
          "error_msg",
          "Incorrect or expired link! Please register again."
        );
        res.redirect("/auth/register");
      } else {
        const { name, email, password } = decodedToken;
        User.findOne({ email: email }).then((user) => {
          if (user) {
            //------------ User already exists ------------//
            req.flash(
              "error_msg",
              "Email ID already registered! Please log in."
            );
            res.redirect("/auth/login");
          } else {
            const newUser = new User({
              name,
              email,
              password,
            });

            bcryptjs.genSalt(10, (err, salt) => {
              bcryptjs.hash(newUser.password, salt, (err, hash) => {
                if (err) throw err;
                newUser.password = hash;
                newUser
                  .save()
                  .then((user) => {
                    req.flash(
                      "success_msg",
                      "Account activated. You can now log in."
                    );
                    res.redirect("/auth/login");
                  })
                  .catch((err) => console.log(err));
              });
            });
          }
        });
      }
    });
  } else {
    console.log("Account activation error!");
  }
};

//------------ Forgot Password Handle ------------//
exports.forgotPassword = (req, res) => {
  const { email } = req.body;

  let errors = [];

  //------------ Checking required fields ------------//
  if (!email) {
    errors.push({ msg: "Please enter an email ID" });
  }

  if (errors.length > 0) {
    res.render("forgot", {
      errors,
      email,
    });
  } else {
    User.findOne({ email: email }).then(async (user) => {
      if (!user) {
        //------------ User already exists ------------//
        errors.push({ msg: "User with Email ID does not exist!" });
        res.render("forgot", {
          errors,
          email,
        });
      } else {
        const oauth2Client = new OAuth2(config.clientId, config.clientSecret, config.redirectURL);

        oauth2Client.setCredentials({
          refresh_token: config.refreshToken
        });
        console.log('******************************************************************')
        const accessToken = oauth2Client.getAccessToken();
        console.log(accessToken)
        const token = jwt.sign({ _id: user._id }, JWT_RESET_KEY, {
          expiresIn: "30m",
        });
        const CLIENT_URL = "http://" + req.headers.host;
        const output = `
                <h2>Please click on below link to reset your account password</h2>
                <p>${CLIENT_URL}/auth/forgot/${token}</p>
                <p><b>NOTE: </b> The activation link expires in 30 minutes.</p>
                `;

        User.updateOne({ resetLink: token }, (err, success) => {
          if (err) {
            errors.push({ msg: "Error resetting password!" });
            res.render("forgot", {
              errors,
              email,
            });
          } else {
            const transporter = nodemailer.createTransport({
              service: "gmail",
              auth: {
                type: "OAuth2",
                user: "msrinivas0025@gmail.com",
                clientId: config.clientId,
                clientSecret: config.clientSecret,
                refreshToken: config.refreshToken,
                accessToken: accessToken,
              },
            });

            // send mail with defined transport object
            const mailOptions = {
              from: '"Auth Admin" <msrinivas0025@gmail.com>', // sender address
              to: email, // list of receivers
              subject: "Account Password Reset: NodeJS Auth ✔", // Subject line
              html: output, // html body
            };

            transporter.sendMail(mailOptions, (error, info) => {
              if (error) {
                console.log(error);
                req.flash(
                  "error_msg",
                  "Something went wrong on our end. Please try again later."
                );
                res.redirect("/auth/forgot");
              } else {
                console.log("Mail sent : %s", info.response);
                req.flash(
                  "success_msg",
                  "Password reset link sent to email ID. Please follow the instructions."
                );
                res.redirect("/auth/login");
              }
            });

            // Creating a new job queue
            // let newJob = jobsQueue.create("emailForgotPwd", mailOptions).save(function (err) {
            //   if (err) {
            //     console.log("Error in sending to the queue", err);
            //     return;
            //   }
            //   console.log("Job Enqueued", newJob.id);
            // }).priority('high');
            // Processing the new job request
            // jobsQueue.process('emailForgotPwd', function(job, done){
            //   console.log('Email worker is processing a job', job.data);
            //   transporter.sendMail(mailOptions, (error, info) => {
            //     if (error) {
            //       console.log(error);
            //       req.flash(
            //         "error_msg",
            //         "Something went wrong on our end. Please try again later."
            //       );
            //       res.redirect("/auth/forgot");
            //     } else {
            //       console.log("Mail sent : %s", info.response);
            //       req.flash(
            //         "success_msg",
            //         "Password reset link sent to email ID. Please follow the instructions."
            //       );
            //       res.redirect("/auth/login");
            //     }
            //   });
            //   done();
            // });
          }
        });
      }
    });
  }
};


//------------ Redirect to Reset Handle ------------//
exports.gotoReset = (req, res) => {
  const { token } = req.params;
// Verify if the token is correct
  if (token) {
    jwt.verify(token, JWT_RESET_KEY, (err, decodedToken) => {
      if (err) {
        req.flash("error_msg", "Incorrect or expired link! Please try again.");
        res.redirect("/auth/login");
      } else {
        const { _id } = decodedToken;
        User.findById(_id, (err, user) => {
          if (err) {
            req.flash(
              "error_msg",
              "User with email ID does not exist! Please try again."
            );
            res.redirect("/auth/login");
          } else {
            res.redirect(`/auth/reset/${_id}`);
          }
        });
      }
    });
  } else {
    console.log("Password reset error!");
  }
};

exports.resetPassword = (req, res) => {
  var { password, password2 } = req.body;
  const id = req.params.id;
  let errors = [];

  //------------ Checking required fields ------------//
  if (!password || !password2) {
    req.flash("error_msg", "Please enter all fields.");
    res.redirect(`/auth/reset/${id}`);
  }

  //------------ Checking password length ------------//
  else if (password.length < 8) {
    req.flash("error_msg", "Password must be at least 8 characters.");
    res.redirect(`/auth/reset/${id}`);
  }

  //------------ Checking password mismatch ------------//
  else if (password != password2) {
    req.flash("error_msg", "Passwords do not match.");
    res.redirect(`/auth/reset/${id}`);
  } else {
    bcryptjs.genSalt(10, (err, salt) => {
      bcryptjs.hash(password, salt, (err, hash) => {
        if (err) throw err;
        password = hash;

        User.findByIdAndUpdate(
          { _id: id },
          { password },
          function (err, result) {
            if (err) {
              req.flash("error_msg", "Error resetting password!");
              res.redirect(`/auth/reset/${id}`);
            } else {
              req.flash("success_msg", "Password reset successfully!");
              res.redirect("/auth/login");
            }
          }
        );
      });
    });
  }
};

//------------ Login Handle ------------//
exports.loginHandle = (req, res, next) => {
  passport.authenticate("local", {
    successRedirect: "/dashboard",
    failureRedirect: "/auth/login",
    failureFlash: true,
  })(req, res, next);
};

//------------ Logout Handle ------------//
exports.logoutHandle = (req, res) => {
  req.logout(function(err) {
    if (err) { return next(err); }
    req.flash("success_msg", "You are logged out");
    res.redirect('/auth/login');
  });
};
