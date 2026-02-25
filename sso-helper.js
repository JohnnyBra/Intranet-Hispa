import jwt from 'jsonwebtoken';

export function checkSSO(req, res) {
    if (process.env.ENABLE_GLOBAL_SSO !== 'true') return null;

    const cookieHeader = req.headers.cookie;
    if (!cookieHeader) return null;

    const cookies = cookieHeader.split('; ').reduce((acc, curr) => {
        const [key, value] = curr.split('=');
        acc[key] = value;
        return acc;
    }, {});

    const token = cookies['BIBLIO_SSO_TOKEN'];
    if (!token) return null;

    try {
        const secret = process.env.JWT_SSO_SECRET || 'default-secret-key-change-me';
        const decoded = jwt.verify(token, secret);

        if (decoded.role === 'FAMILY' || decoded.role === 'STUDENT') {
            res.writeHead(403, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, message: 'Acceso denegado a Intranet para roles FAMILY o STUDENT.' }));
            return 'BLOCKED';
        }

        if (decoded.role === 'TEACHER' || decoded.role === 'ADMIN' || decoded.role === 'TUTOR') {
            return decoded;
        }

        return null;
    } catch (err) {
        console.warn("Global SSO Token invalid or expired", err.message);
        return null;
    }
}
