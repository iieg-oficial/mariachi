import { http, HttpResponse } from 'msw';
import { searchablePages, globalSearchData } from '../data/search';

export const searchHandlers = [
    http.get('/api/search/content', ({ request }) => {
        const url = new URL(request.url);
        const searchTerm = url.searchParams.get('q') || '';
        const status = url.searchParams.get('status');
        const author = url.searchParams.get('author');
        const startDate = url.searchParams.get('startDate');
        const endDate = url.searchParams.get('endDate');

        let results = [...searchablePages];

        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            results = results.filter(page =>
                page.title.toLowerCase().includes(term) ||
                page.description.toLowerCase().includes(term) ||
                page.slug.toLowerCase().includes(term) ||
                page.tags.some(tag => tag.toLowerCase().includes(term))
            );
        }

        if (status) {
            results = results.filter(page => page.status === status);
        }

        if (author) {
            results = results.filter(page => page.author === author);
        }

        if (startDate && endDate) {
            const start = new Date(startDate);
            const end = new Date(endDate);
            results = results.filter(page => {
                const pageDate = new Date(page.lastModified);
                return pageDate >= start && pageDate <= end;
            });
        }

        return HttpResponse.json(results);
    }),

    http.get('/api/search/global', ({ request }) => {
        const url = new URL(request.url);
        const query = url.searchParams.get('q') || '';

        if (!query) {
            return HttpResponse.json([]);
        }

        const term = query.toLowerCase();
        const results = globalSearchData.filter(item =>
            item.title.toLowerCase().includes(term) ||
            item.category.toLowerCase().includes(term)
        );

        return HttpResponse.json(results);
    }),

    http.get('/api/search/authors', () => {
        const authors = [...new Set(searchablePages.map(page => page.author))];
        return HttpResponse.json(authors);
    })
];
