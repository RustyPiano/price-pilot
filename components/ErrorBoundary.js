import React from 'react';

export default class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError() {
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        console.error('Application error boundary caught an error:', error, errorInfo);
    }

    handleRetry = () => {
        this.setState({ hasError: false });
        window.location.reload();
    };

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen bg-surface-100 text-foreground flex items-center justify-center px-4">
                    <div className="max-w-md w-full theme-card p-6 text-center space-y-4">
                        <div className="space-y-2">
                            <h1 className="text-2xl font-bold">Something went wrong</h1>
                            <p className="text-sm text-gray-500">
                                The app hit an unexpected error. Reload to try again.
                            </p>
                            <p className="text-sm text-gray-500">
                                应用遇到了意外错误，刷新后重试。
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={this.handleRetry}
                            className="theme-btn theme-btn-primary w-full py-3"
                        >
                            Reload
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
