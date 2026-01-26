import { http, HttpResponse } from 'msw';
import { users as initialUsers } from '../data/users';

let users = [...initialUsers];

export const usersHandlers = [
    http.get('/users', async () => {
        return HttpResponse.json(users);
    }),

    http.get('/users/:id', async ({ params }) => {
        const user = users.find(u => u.id === params.id);

        if (!user) {
            return HttpResponse.json(
                { error: 'Usuario no encontrado' },
                { status: 404 }
            );
        }

        return HttpResponse.json(user);
    }),

    http.post('/users', async ({ request }) => {
        try {
            const newUser = await request.json();

            if (!newUser.username || !newUser.password || !newUser.email || !newUser.name || !newUser.role) {
                return HttpResponse.json(
                    { error: 'Todos los campos son requeridos' },
                    { status: 400 }
                );
            }

            const existingUser = users.find(u => u.username === newUser.username);
            if (existingUser) {
                return HttpResponse.json(
                    { error: 'El nombre de usuario ya existe' },
                    { status: 409 }
                );
            }

            const user = {
                id: String(users.length + 1),
                ...newUser,
                createdAt: new Date().toISOString()
            };

            users.push(user);

            const { password: _password, ...userResponse } = user;
            return HttpResponse.json(userResponse, { status: 201 });
        } catch {
            return HttpResponse.json(
                { error: 'Error interno del servidor' },
                { status: 500 }
            );
        }
    }),

    http.put('/users/:id', async ({ params, request }) => {
        try {
            const updates = await request.json();
            const userIndex = users.findIndex(u => u.id === params.id);

            if (userIndex === -1) {
                return HttpResponse.json(
                    { error: 'Usuario no encontrado' },
                    { status: 404 }
                );
            }

            users[userIndex] = {
                ...users[userIndex],
                ...updates,
                id: users[userIndex].id,
                createdAt: users[userIndex].createdAt
            };

            const { password: _password, ...userResponse } = users[userIndex];
            return HttpResponse.json(userResponse);
        } catch {
            return HttpResponse.json(
                { error: 'Error interno del servidor' },
                { status: 500 }
            );
        }
    }),

    http.delete('/users/:id', async ({ params }) => {
        const userIndex = users.findIndex(u => u.id === params.id);

        if (userIndex === -1) {
            return HttpResponse.json(
                { error: 'Usuario no encontrado' },
                { status: 404 }
            );
        }

        users.splice(userIndex, 1);

        return HttpResponse.json(
            { message: 'Usuario eliminado exitosamente' },
            { status: 200 }
        );
    })
];
