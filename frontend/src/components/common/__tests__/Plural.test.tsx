import { render } from 'vitest-browser-react';

import Plural from '../Plural';

describe('Plural', () => {
    it.each([
        {
            scenario: 'renders "zero" text when value is 0 and zero prop is provided',
            value: 0,
            one: 'one item',
            many: 'many items',
            zero: 'no items',
            expected: 'no items',
        },
        {
            scenario: 'renders "many" text when value is 0 and zero prop is not provided',
            value: 0,
            one: 'one item',
            many: 'many items',
            zero: undefined,
            expected: 'many items',
        },
        {
            scenario: 'renders "one" text when value is 1',
            value: 1,
            one: 'one item',
            many: 'many items',
            zero: 'no items',
            expected: 'one item',
        },
        {
            scenario: 'renders "many" text when value is 2',
            value: 2,
            one: 'one item',
            many: 'many items',
            zero: 'no items',
            expected: 'many items',
        },
        {
            scenario: 'renders "many" text when value is greater than 2',
            value: 5,
            one: 'one item',
            many: 'many items',
            zero: 'no items',
            expected: 'many items',
        },
        {
            scenario: 'renders "many" text when value is negative',
            value: -1,
            one: 'one item',
            many: 'many items',
            zero: 'no items',
            expected: 'many items',
        },
        {
            scenario: 'renders "many" text when value is a large number',
            value: 100,
            one: 'one second',
            many: 'many seconds',
            zero: 'no seconds',
            expected: 'many seconds',
        },
    ])('$scenario', async ({ value, one, many, zero, expected }) => {
        const { getByText } = await render(<Plural value={value} one={one} many={many} zero={zero} />);

        await expect.element(getByText(expected)).toBeInTheDocument();
    });
});
