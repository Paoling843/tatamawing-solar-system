import { Component } from 'react';
import FullPageMessage from './FullPageMessage';

// Catches a crash while a page renders (e.g. an old record missing a field)
// and shows a way out instead of a blank white screen. App.jsx keys it by
// the URL, so going to another page starts fresh.
export default class ErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = { error: null };
    }

    static getDerivedStateFromError(error) {
        return { error };
    }

    componentDidCatch(error, info) {
        // Kept in the browser console for whoever is fixing it
        console.error('Page crashed:', error, info?.componentStack);
    }

    render() {
        if (!this.state.error) return this.props.children;

        return (
            <FullPageMessage
                title="Something went wrong on this page"
                description="The page ran into an unexpected problem. Reloading usually fixes it. If it keeps happening, message us and tell us what you were doing so we can fix it."
                actions={[
                    { label: 'Reload page', primary: true, onClick: () => window.location.reload() },
                    { label: 'Go to home', onClick: () => window.location.assign('/') },
                ]}
            />
        );
    }
}
