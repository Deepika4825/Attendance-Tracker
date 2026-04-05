
# Smart Student Attendance Tracker

**Live Demo:** https://attendance-tracker-three-gamma.vercel.app

A full-stack web application built using the MERN stack (MongoDB, Express.js, React.js, Node.js) that automates and simplifies student attendance management using a QR-based system.


## Problem Statement

Traditional attendance systems are time-consuming, paper-based, and prone to proxy attendance. Managing records manually also leads to errors and lack of real-time visibility.


## Solution Overview

This system replaces manual attendance with a dynamic QR-based mechanism. Teachers generate a QR code for each session, and students scan the code to mark their attendance instantly. The QR code refreshes automatically at regular intervals to maintain session integrity.



## User Roles

### Teacher

* Create and manage multiple classes
* Upload student lists using CSV files
* Generate QR codes for attendance sessions
* View attendance reports
* Evaluate student activities

### Student

* Login using institutional email
* Scan QR code to mark attendance
* View attendance history
* Upload activity submissions


## How It Works

1. Users log in using their email and password
2. The system determines the role based on email format

   * Student emails begin with year digits (e.g., 23ad010@...)
   * Teacher emails begin with department code (e.g., ad010@...)
3. Teachers create classes and upload student data
4. A QR code is generated for each class session
5. Students scan the QR code to mark attendance
6. Attendance data is stored and reflected in dashboards



## Key Features

* QR-based attendance with automatic refresh
* Role-based authentication for students and teachers
* Multi-class management system
* CSV-based bulk student upload
* Automatic student account creation
* Activity submission with file upload
* Activity evaluation controlled by teachers
* Attendance tracking and analytics
* Subject-wise performance insights
* Identification of top performers
* Password recovery using roll number verification
* Responsive user interface


## Tech Stack

### Frontend

* React.js 18
* Vite
* React Router DOM v6
* Axios
* qrcode.react
* Plain CSS

### Backend

* Node.js
* Express.js
* Mongoose
* JSON Web Token (JWT)
* bcryptjs
* Multer
* csv-parse
* uuid
* dotenv

### Database

* MongoDB Atlas



## Deployment

* Frontend: Deployed on Vercel
* Backend: Deployed on Railway
* Database: MongoDB Atlas



## Architecture

* MERN Stack
* REST API-based backend
* JWT-based authentication
* Role-based access control



## Future Enhancements

* Advanced analytics dashboard
* Location-based attendance validation
* Mobile application support
* AI-based performance insights



