import type { ReactNode } from 'react';

type Props = {
    className?: string;
    children: ReactNode;
};

function InfoCard({ className, children }: Props) {
    return <div className={`bg-zinc-700 rounded-xl shadow-lg overflow-hidden ${className}`}>{children}</div>;
}

export default InfoCard;
