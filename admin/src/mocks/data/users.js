export const users = [
    {
        id: '1',
        username: 'admin',
        password: 'admin123',
        email: 'teltamamakani@iieg.gob.mx',
        name: 'Administrador IIEG',
        role: 'tetlamamakani',
        createdAt: '2025-01-01T00:00:00Z'
    },
    {
        id: '2',
        username: 'editora',
        password: 'editora123',
        email: 'editora@iieg.gob.mx',
        name: 'Editora de Contenidos',
        role: 'editora',
        createdAt: '2025-01-15T00:00:00Z'
    },
    {
        id: '3',
        username: 'diseñadora',
        password: 'diseñadora123',
        email: 'disenadora@iieg.gob.mx',
        name: 'Diseñadora Gráfica',
        role: 'diseñadora',
        createdAt: '2025-02-15T00:00:00Z'
    },
    {
        id: '4',
        username: 'viewer',
        password: 'viewer123',
        email: 'viewer@iieg.gob.mx',
        name: 'Usuario Consulta',
        role: 'viewer',
        createdAt: '2025-02-01T00:00:00Z'
    }
];

export const findUserByCredentials = (username, password) => {
    return users.find(
        user => user.username === username && user.password === password
    );
};

export const getUserPublicData = (user) => {
    const { password: _password, ...publicData } = user;
    return publicData;
};
