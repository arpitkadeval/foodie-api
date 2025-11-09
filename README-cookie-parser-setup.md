# Setup cookie-parser middleware in backend

1. Install cookie-parser package:

```bash
npm install cookie-parser
```

2. Import and use cookie-parser in backend/server.js:

```js
import cookieParser from 'cookie-parser';

app.use(cookieParser());
```

Make sure to add `app.use(cookieParser());` before your route definitions.

This will enable Express to parse cookies and populate `req.cookies`.

3. Restart the backend server after making these changes.

This should fix the issue of missing token in auth middleware and resolve 401 Unauthorized errors.
