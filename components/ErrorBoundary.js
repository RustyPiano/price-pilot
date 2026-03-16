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
                <div className="page-shell flex items-center justify-center px-4 text-foreground">
                    <div className="panel max-w-md w-full space-y-4 p-6 text-center">
                        <div className="space-y-2">
                            <h1 className="text-2xl font-bold">Something went wrong</h1>
                            <p className="text-sm text-muted">
                                The app hit an unexpected error. Reload to try again.
                            </p>
                            <p className="text-sm text-muted">
                                应用遇到了意外错误，刷新后重试。
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={this.handleRetry}
                            className="btn btn-primary w-full"
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
