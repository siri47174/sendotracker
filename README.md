# Sendo Fleet Tracker — Backend API

## Stack
- **Node.js + Express** — REST API
- **MongoDB Atlas** — Cloud database
- **Render.com** — Free hosting

---

## Step 1: MongoDB Atlas Setup

1. Go to https://cloud.mongodb.com → Sign up (free)
2. Create a new **Project** → name it `sendo-fleet`
3. Create a **Cluster** → choose **M0 Free Tier**
4. Under **Database Access** → Add user:
   - Username: `sendo_admin`
   - Password: (generate a strong password, save it)
   - Role: `Atlas admin`
5. Under **Network Access** → Add IP Address → `0.0.0.0/0` (allow all)
6. Click **Connect** → **Drivers** → **Node.js**
7. Copy the connection string:
   ```
   mongodb+srv://sendo_admin:<password>@cluster0.xxxxx.mongodb.net/sendo_fleet?retryWrites=true&w=majority
   ```
8. Replace `<password>` with your actual password

---

## Step 2: Deploy to Render.com

1. Push this folder to **GitHub**:
   ```bash
   git init
   git add .
   git commit -m "Sendo Fleet API"
   git push origin main
   ```

2. Go to https://render.com → Sign up → **New Web Service**

3. Connect your GitHub repo

4. Settings:
   - **Name:** `sendo-fleet-api`
   - **Runtime:** Node
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`

5. Under **Environment Variables**, add:
   - Key: `MONGODB_URI`
   - Value: (paste your Atlas connection string)

6. Click **Deploy** → wait 2-3 minutes

7. Your API URL will be:
   ```
   https://sendo-fleet-api.onrender.com
   ```

---

## Step 3: Connect HTML App to API

In `fleet_sidebar_v2.html`, find this line at the top:
```javascript
const API_URL = ''; // paste your Render URL here
```

Replace with:
```javascript
const API_URL = 'https://sendo-fleet-api.onrender.com';
```

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/months` | Get all available months |
| GET | `/api/fills/:month` | Get all fills for a month (e.g. `Jan-2026`) |
| POST | `/api/fills` | Save single fill entry |
| POST | `/api/fills/bulk` | Save entire month data |
| DELETE | `/api/fills/:vehicle/:month/:date` | Delete a fill |
| GET | `/api/odometer/:vehicle` | Get all odometer readings for vehicle |
| POST | `/api/odometer` | Save odometer reading |
| DELETE | `/api/odometer/:id` | Delete odometer entry |
| GET | `/api/schedule` | Get all schedule configs |
| POST | `/api/schedule/bulk` | Save all schedule configs |
| GET | `/api/escalations` | Get all escalations |
| POST | `/api/escalations` | Save escalation |
| PATCH | `/api/escalations/:id` | Update escalation status |

---

## Data Flow

```
Employee enters odometer → POST /api/odometer
Admin saves monthly data → POST /api/fills/bulk
Admin selects month → GET /api/fills/Jan-2026 → dashboard updates
Admin selects date → filters from fetched month data → daily view updates
```
