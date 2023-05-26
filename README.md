## NodeJS-Auth Features
A complete NodeJS + Express + PassportJS + JWT authentication app:
1. Used a local stratergy for authenticating every request.
2. Used JWT token to send the mails to user on registration and resetting password.
3. Used OAuth authorization of Google without passport for sending token via mails and redirecting to Dashboard on successfull login.
4. Used Nodemailer for configuring the mailing functionality.
5. Used Kue for scheduling parallel jobs of sending mails.
6. Used bcrypt library for storing hash of password and decoding it for comparing it on login.

## Setup
1. npm i
2. Run-> nodemo.index.js

## Folder Structure

## Folder Structure

nodejs-auth <br>
├── assets <br>
│ --- ├── authentication.png <br>
│ --- └── css <br>
│ -------- └── bootstrap.min.css <br>
├── config <br>
│ --- ├── checkAuth.js <br>
│ --- ├── key.js <br>
│ --- └── passport.js <br>
├── config <br>
│ --- └──authController.js
├── models <br>
│ --- └── User.js <br>
├── node_modules <br>
├── routes <br>
│ --- ├── auth.js <br>
│ --- └── index.js <br>
├── views <br>
│ --- ├── dash.ejs <br>
│ --- ├── forgot.ejs <br>
│ --- ├── layout.ejs <br>
│ --- ├── login.ejs <br>
│ --- ├── messages.ejs <br>
│ --- ├── register.ejs <br>
│ --- ├── reset.ejs <br>
│ --- └── welcome.ejs <br>
├── .gitignore <br>
├── package.json <br>
├── package-lock.json <br>
├── README.md <br>
└── index.js <br>
