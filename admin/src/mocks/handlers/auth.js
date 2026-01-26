import { http, HttpResponse } from 'msw';
import { findUserByCredentials, getUserPublicData } from '../data/users';

const generateMockToken = (user) => {
    return `mock-jwt-token-${user.id}-${Date.now()}`;
};

const activeSessions = new Map();

export const authHandlers = [
    http.post('/auth/login', async ({ request }) => {
        try {
            const { username, password } = await request.json();

            if (!username || !password) {
                return HttpResponse.json(
                    { error: 'Usuario y contraseña son requeridos' },
                    { status: 400 }
                );
            }

            const user = findUserByCredentials(username, password);

            if (!user) {
                await new Promise(resolve => setTimeout(resolve, 1000));
                return HttpResponse.json(
                    { error: 'Credenciales inválidas' },
                    { status: 401 }
                );
            }

            const token = generateMockToken(user);

            activeSessions.set(token, {
                userId: user.id,
                createdAt: Date.now()
            });

            return HttpResponse.json(
                {
                    user: getUserPublicData(user),
                    message: 'Inicio de sesión exitoso'
                },
                {
                    status: 200,
                    headers: {
                        'Set-Cookie': `auth_token=${token}; HttpOnly; Secure; SameSite=Strict; Max-Age=3600; Path=/`
                    }
                }
            );
        } catch {
            return HttpResponse.json(
                { error: 'Error interno del servidor' },
                { status: 500 }
            );
        }
    }),

    http.post('/auth/logout', async ({ cookies }) => {
        const token = cookies.auth_token;

        if (token) {
            activeSessions.delete(token);
        }

        return HttpResponse.json(
            { message: 'Sesión cerrada exitosamente' },
            {
                status: 200,
                headers: {
                    'Set-Cookie': 'auth_token=; HttpOnly; Secure; SameSite=Strict; Max-Age=0; Path=/'
                }
            }
        );
    }),

    http.get('/auth/me', async ({ cookies }) => {
        const token = cookies.auth_token;

        if (!token) {
            return HttpResponse.json(
                { error: 'No autorizado' },
                { status: 401 }
            );
        }

        const session = activeSessions.get(token);

        if (!session) {
            return HttpResponse.json(
                { error: 'Sesión inválida o expirada' },
                { status: 401 }
            );
        }

        const sessionAge = Date.now() - session.createdAt;
        if (sessionAge > 3600000) {
            activeSessions.delete(token);
            return HttpResponse.json(
                { error: 'Sesión expirada' },
                { status: 401 }
            );
        }

        const { users } = await import('../data/users');
        const user = users.find(u => u.id === session.userId);

        if (!user) {
            return HttpResponse.json(
                { error: 'Usuario no encontrado' },
                { status: 404 }
            );
        }

        return HttpResponse.json({
            user: getUserPublicData(user)
        });
    }),

    http.get('/auth/verify', async ({ cookies }) => {
        const token = cookies.auth_token;

        if (!token || !activeSessions.has(token)) {
            return HttpResponse.json(
                { valid: false },
                { status: 401 }
            );
        }

        return HttpResponse.json({ valid: true });
    })
];
