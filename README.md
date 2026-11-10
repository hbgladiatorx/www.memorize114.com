# Memorize 114 — حِفْظُ الْقُرْآن

Qurʾān memorisation built on research-backed methods: spaced repetition (FSRS-4.5), retrieval practice with feedback, cumulative phrase build-up, vanishing cues down to first letters, look-alike verse (mutashābihāt) drills, a page map of the Madinah muṣḥaf, and recitation for every verse. English and full Arabic interface. Accounts keep progress across devices; teachers run classes; an admin dashboard shows usage.

Live at **https://www.memorize114.com**

## What is in this repository

| Folder | What it is |
|---|---|
| `web/` | The site — React (Vite). `web/public/data/` holds the Qurʾān text, layout, look-alike index and translation; `web/public/fonts/` the KFGQPC Hafs font |
| `server/` | The API — Node (Express 5) + PostgreSQL: accounts, progress sync, classes, admin |
| `deploy/` | Scripts and config for the Lightsail server |
| `tools/duas/` | The duʿāʾ texts (Kumayl, al-ʿAhd) as curated sources, and `build.py`, which turns them into the app's data files |

## Putting it on Lightsail (first time)

Works on **AlmaLinux 8–9, Amazon Linux 2023 or Ubuntu 22.04/24.04** (login user `ec2-user` or `ubuntu`). On AlmaLinux, install git first: `sudo dnf install -y git`.

1. **In the Lightsail console**
   - Networking → attach a **static IP**, and add a firewall rule for **HTTPS (443)** (HTTP 80 and SSH 22 are open by default).
2. **DNS** (wherever memorize114.com is registered): create two **A records** pointing to the static IP — `memorize114.com` and `www.memorize114.com`.
3. **Connect** to the instance (Lightsail's browser SSH button works) and give it read access to this private repository with a deploy key:
   ```bash
   ssh-keygen -t ed25519 -N "" -f ~/.ssh/id_ed25519
   cat ~/.ssh/id_ed25519.pub
   ```
   Copy the printed line into GitHub → this repository → Settings → **Deploy keys** → *Add deploy key* (read access is enough).
4. **Clone and run the setup script**:
   ```bash
   sudo mkdir -p /opt/memorize114 && sudo chown $USER /opt/memorize114
   git clone git@github.com:hbgladiatorx/www.memorize114.com.git /opt/memorize114
   sudo bash /opt/memorize114/deploy/setup.sh
   ```
   It asks for your email (that account becomes the **administrator**) and, optionally, Amazon SES details for email. It installs Node, PostgreSQL and nginx, creates the database, builds the site, starts the API as a service and gets the HTTPS certificate.
5. Open **https://www.memorize114.com**, click the person icon → **Create account** with the email you gave. You are now the admin: the **Admin** button is on your account page.

## Updating after changes

```bash
sudo bash /opt/memorize114/deploy/update.sh
```
Pulls from GitHub, rebuilds, applies any database changes and restarts the API.

## Email (password reset and confirmation)

Emails go through **Amazon SES**. Until SES is set up, the site works but reset links are only written to the server log (`sudo journalctl -u memorize114 | grep mail`).

1. AWS console → **SES** → *Verified identities* → add the domain `memorize114.com` and add the DNS records it shows (DKIM).
2. Request **production access** (SES starts in a sandbox that can only email verified addresses).
3. IAM → create a user with the `AmazonSESFullAccess` policy (or just `ses:SendEmail`) → create an access key.
4. Put the region and key in `/opt/memorize114/server/.env` (`SES_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`), then `sudo systemctl restart memorize114`.

## Roles

- **Student** — everyone who registers. Progress syncs to their account. They can join a class with a code (or a `/join/CODE` link); the teacher then sees their name, email and progress on the assigned sūrahs.
- **Teacher** — made by the admin (Admin → Users → Role). Creates classes, assigns sūrahs, shares the join code, sees each student's progress.
- **Admin** — the email(s) in `ADMIN_EMAILS`. Sees users, sign-ups, activity and the most-memorised sūrahs, and sets roles.

## Running it on a computer (development)

Needs Node 20+ and PostgreSQL.
```bash
cp server/.env.example server/.env        # set DATABASE_URL, APP_URL=http://localhost:5173
cd server && npm install && npm run migrate && npm start      # API on :3000
cd web && npm install && npm run dev                          # site on :5173
```

## Daily operation

- API log: `sudo journalctl -u memorize114 -f`
- Restart API: `sudo systemctl restart memorize114`
- Database backup: `sudo -u postgres pg_dump m114 > m114-$(date +%F).sql`

## Sources and licences

- **Qurʾān text, page/line layout and font**: King Fahd Glorious Qurʾān Printing Complex (KFGQPC), Uthmanic Hafs v18 — free to use; the text must not be altered.
- **English translation**: Ali Quli Qarai, via Tanzil.net — non-commercial use, unaltered, with credit (shown under every verse).
- **Recitation**: streamed per verse from everyayah.com (al-ʿAfāsī by default; al-Ḥuṣarī and al-Minshāwī selectable).
- **Word timings** for follow-along highlighting: [quran-align](https://github.com/cpfair/quran-align) by Collin Fair (release 2016-11-24, timing for the EveryAyah `Alafasy_128kbps` recording), licensed [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) — attribution required. Built into `web/public/data/timing/` by `tools/timing/build.py`; verses whose word count does not match the app's text are left without word highlighting (25 of 6,236).
- **Duʿāʾ Kumayl and Duʿāʾ al-ʿAhd** (ids 201 and 202): text as given in Mafātīḥ al-Jinān (Shaykh ʿAbbās al-Qummī) — Kumayl from al-Ṭūsī's *Miṣbāḥ al-Mutahajjid*, al-ʿAhd from Ibn Ṭāwūs's *Miṣbāḥ al-Zāʾir*. Checked word by word against independent digital editions (three for Kumayl, two for al-ʿAhd); manuscript variants are shown on the passages they affect. The English is a working translation written for this app and should be reviewed. Edit `tools/duas/*.json`, then run `python3 tools/duas/build.py` and commit the regenerated files in `web/public/data/`.
- **Guided layers** for al-Jumuʿah (62) and al-Mursalāt (77) in `web/public/data/e062.json` and `e077.json` — memory hooks, Arabic meanings and look-alike notes written for this app; every Qurʾānic quotation in them was checked verbatim against the KFGQPC text.
