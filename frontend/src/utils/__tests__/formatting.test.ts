import { capitalizeFirstLetter } from '../formatting';

describe('capitalizeFirstLetter', () => {
    it.each([
        {
            input: 'hello',
            expected: 'Hello',
        },
        {
            input: 'World',
            expected: 'World',
        },
        {
            input: 'a',
            expected: 'A',
        },
    ])('capitalizes the first letter of $input', ({ input, expected }) => {
        const result = capitalizeFirstLetter(input);
        expect(result).toBe(expected);
    });
});
