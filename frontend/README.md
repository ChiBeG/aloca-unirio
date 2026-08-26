# Frontend MVP

Next.js frontend for the UNIRIO classroom allocation workflow.

## Local development

Run the legacy Django wrapper in the repo root:

```bash
python manage.py runserver 8000
```

Run the frontend in this folder:

```bash
npm install
npm run dev
```

The frontend expects Django at `http://127.0.0.1:8000`. Override it with:

```bash
DJANGO_BASE_URL=http://127.0.0.1:8000 npm run dev
```

## Scripts

- `npm run dev`: Next.js app on port 3002
- `npm run build`: production build
- `npm run test`: component tests
- `npm run test:e2e`: browser smoke test
