type PluralProps = {
    value: number;
    one: string;
    many: string;
    zero?: string;
};

const Plural = ({ value, one, many, zero }: PluralProps) => {
    if (value === 0) {
        return <>{zero ?? many}</>;
    }
    if (value === 1) {
        return <>{one}</>;
    }
    return <>{many}</>;
};

export default Plural;
