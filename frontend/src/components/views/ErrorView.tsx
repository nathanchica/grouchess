import { NotConfiguredError, ServiceUnavailableError } from '@grouchess/errors';
import { type FallbackProps } from 'react-error-boundary';


function ErrorView({ error }: FallbackProps) {
    let headerText = 'Oh no!';
    if (error instanceof NotConfiguredError) {
        headerText = 'Configuration error';
    } else if (error instanceof ServiceUnavailableError) {
        headerText = 'Service unavailable';
    }

    let errorText = 'Oops, something went wrong. Please try again later.';
    if (error instanceof NotConfiguredError) {
        errorText = error.message;
    } else if (error instanceof ServiceUnavailableError) {
        errorText = 'The service may be down. Please try again later.';
    }

    return (
        <div className="flex-1 flex items-center">
            <section className="flex w-full max-w-3xl flex-col items-center gap-4 rounded-3xl border border-red-800/60 bg-red-950/40 p-24 text-center shadow-2xl shadow-black/30">
                <div className="flex flex-row gap-2">
                    <img src="/images/tower-fall.svg" className="size-8 text-white" />
                    <h2 className="text-xl font-semibold text-red-200 sm:text-2xl">{headerText}</h2>
                </div>
                <p className="text-sm text-red-300">{errorText}</p>
            </section>
        </div>
    );
}

export default ErrorView;
