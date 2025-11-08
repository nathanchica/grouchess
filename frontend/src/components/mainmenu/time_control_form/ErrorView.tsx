import type { FallbackProps } from 'react-error-boundary';

function ErrorView({ error }: FallbackProps) {
    return (
        <p role="alert" className="rounded-2xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {error.message}
        </p>
    );
}

export default ErrorView;
