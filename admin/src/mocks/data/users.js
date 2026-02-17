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
