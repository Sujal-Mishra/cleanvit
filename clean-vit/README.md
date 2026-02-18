# Clean VIT - Room Cleaning Request System

## Prerequisites
- Node.js 18+ installed

## Setup Instructions

1.  **Install Dependencies**
    ```bash
    cd clean-vit
    npm install
    ```

2.  **Initialize Database**
    ```bash
    npx prisma generate
    npx prisma db push
    ```

3.  **Run Development Server**
    ```bash
    npm run dev
    ```

4.  **Access the App**
    Open [http://localhost:3000](http://localhost:3000)

## Features
- **Student Portal**: Sign up, Login, Request Cleaning, View QR Code.
- **Cleaner Portal**: Login, View Assigned Block Requests, Accept Jobs, Scan QR to Complete.
- **Admin Portal**: Login, View Stats, Register Cleaners.

## Default Credentials (for testing)
- You will need to create a student account via Sign Up.
- You will need to create an Admin account manually in the database or use the `npx prisma studio` to add one.
- **Cleaner Accounts**: Must be created by an Admin from the Admin Dashboard.
