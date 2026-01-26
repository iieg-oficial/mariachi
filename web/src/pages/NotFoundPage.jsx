import { Link } from 'react-router'

function NotFoundPage() {
    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
            <h1 className="text-9xl font-bold text-gray-300">404</h1>
            <h2 className="text-3xl font-bold text-gray-800 mb-4">Página no encontrada</h2>
            <p className="text-gray-600 mb-8">La página que buscas no existe o ha sido movida.</p>
            <Link to="/" className="btn-primary">
                Volver al inicio
            </Link>
        </div>
    )
}

export default NotFoundPage
