# NID Cut-off Website

A website for NID students to register, enter their discipline preferences and Sem 1 marks, and view cut-off rankings and data charts.

## Features

- **Student Registration**: First name, last name, batch year, @nid.edu email (verified), password
- **Auto-generated Username**: `(First4)-(Batch)@(Last2)` e.g. `shub-2024@vs`
- **Login/Logout**: Session-based authentication
- **Preference Input**: Rank all 8 disciplines (1–8). Preferences are versioned; each edit creates a new version with timestamp
- **Sem 1 Marks**: Optional section to enter marks
- **Cut-off Ranking**: Live rankings using the formula:
  - `a_n = (8 - n + 1) / 8` for position n
  - `x = Σ (i_n × a_n)` per discipline
  - Higher x ⇒ higher expected cutoff

## Tech Stack

- **Backend**: Node.js, Express
- **Database**: MySQL
- **Frontend**: HTML, CSS, JavaScript, Chart.js

## 8 Disciplines

1. Textile design  
2. Product design  
3. Glass and ceramics design  
4. Furniture and interior design  
5. Film and video communication  
6. Graphic design  
7. Animation  
8. Exhibition design  

## 1. Install prerequisites on Windows (no `winget`)

These steps assume **Windows 10/11** and **PowerShell**. They do **not** use `winget`.

### 1.1 Install Node.js

**Option A – Using installer (recommended)**

1. Open your browser and go to `https://nodejs.org`.
2. Download the **LTS** Windows installer.
3. Run the installer and keep the default options (this adds `node` and `npm` to PATH).
4. Close and reopen PowerShell, then verify:

```powershell
node -v
npm -v
```

Both commands should print versions (for example `v20.x.x`).

**Option B – Using Chocolatey (all command line)**

1. Open **PowerShell as Administrator**.
2. Install Chocolatey:

```powershell
Set-ExecutionPolicy Bypass -Scope Process -Force; `
  [System.Net.ServicePointManager]::SecurityProtocol = `
  [System.Net.ServicePointManager]::SecurityProtocol -bor 3072; `
  iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))
```

3. Close and reopen **Administrator PowerShell**, then run:

```powershell
choco install -y nodejs-lts
```

4. Verify:

```powershell
node -v
npm -v
```

### 1.2 Install MySQL Server

**Option A – Using official installer**

1. Go to `https://dev.mysql.com/downloads/mysql/`.
2. Download the **MySQL Community Server** installer for Windows.
3. Run the installer and choose a setup type (Developer Default is fine).
4. Remember the **root password** you set.

**Option B – Using Chocolatey**

If you already have Chocolatey installed:

```powershell
choco install -y mysql
```

Then configure MySQL and set a root password as prompted.

After installation, ensure the MySQL service is running (from **Services** app or MySQL Notifier).

## 2. Get the project code

If you already have the folder `C:\shubha\nid-website`, you can skip the clone step and just `cd` into it.

```powershell
cd C:\shubha
git clone <your-repo-url> nid-website
cd nid-website
```

Or, if the code is already present:

```powershell
cd C:\shubha\nid-website
```

## 3. Install Node.js dependencies

From inside the project folder:

```powershell
npm install
```

## 4. Configure environment

1. Copy `.env.example` to `.env`:

```powershell
copy .env.example .env
```

2. Edit `.env` (using Notepad, VS Code, or any editor) and set your MySQL credentials:

```text
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=nid_website
SESSION_SECRET=your-secret-key
PORT=3000
```

Make sure `DB_USER` and `DB_PASSWORD` match your MySQL root user (or another user with permission to create tables).

## 5. Initialize the database

1. Ensure the **MySQL Server** service is running.
2. Run the DB init script:

```powershell
npm run init-db
```

This will:

- Create the `nid_website` database (if it does not exist).
- Create tables (`users`, `preference_versions`, `disciplines`, `sem_marks`).
- Insert the 8 disciplines.

## 6. Start the application

To run the server:

```powershell
npm start
```

For development with auto-reload (requires `nodemon`, already in devDependencies):

```powershell
npm run dev
```

Then open your browser and go to:

- `http://localhost:3000`

You should see the login/registration screen.

## 7. Git commands (optional)

If you want to version this project with Git:

```powershell
cd C:\shubha\nid-website
git init
git add .
git commit -m "Initial commit: NID Cut-off website"
git remote add origin <your-repo-url>
git push -u origin main
```

## Database Tables (summary)

- **users**: Login (first_name, last_name, batch_year, email, username, password_hash)
- **preference_versions**: Versioned preferences (user_id, version, pref_1..pref_8, created_at)
- **disciplines**: 8 disciplines
- **sem_marks**: Sem 1 marks per user

---

Created by Shubhapradha v.s. | NID Website Project
