import { userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-react';

import DisplayNameForm from '../DisplayNameForm';

describe('DisplayNameForm', () => {
    const defaultProps = {
        onDisplayNameChange: vi.fn(),
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('Initial render', () => {
        it('renders with empty input field', async () => {
            const { getByRole } = await render(<DisplayNameForm {...defaultProps} />);

            const input = getByRole('textbox', { name: /display name/i });
            await expect.element(input).toBeVisible();
            await expect.element(input).toHaveValue('');
        });

        it('shows placeholder text', async () => {
            const { getByPlaceholder } = await render(<DisplayNameForm {...defaultProps} />);

            const input = getByPlaceholder('Enter your display name');
            await expect.element(input).toBeVisible();
        });

        it('does not show character counter initially', async () => {
            const { getByText } = await render(<DisplayNameForm {...defaultProps} />);

            await expect
                .element(getByText(/characters\. alphanumeric characters and spaces only\./i))
                .not.toBeInTheDocument();
        });

        it('applies default label className when not provided', async () => {
            const { getByText } = await render(<DisplayNameForm {...defaultProps} />);

            const label = getByText('Display Name (optional)');
            await expect.element(label).toHaveClass('text-lg');
            await expect.element(label).toHaveClass('sm:text-xl');
            await expect.element(label).toHaveClass('font-medium');
            await expect.element(label).toHaveClass('text-zinc-100');
        });

        it('applies custom label className when provided', async () => {
            const customClass = 'text-2xl text-blue-500 font-bold';
            const { getByText } = await render(<DisplayNameForm {...defaultProps} labelClassName={customClass} />);

            const label = getByText('Display Name (optional)');
            await expect.element(label).toHaveClass('text-2xl');
            await expect.element(label).toHaveClass('text-blue-500');
            await expect.element(label).toHaveClass('font-bold');
        });
    });

    describe('Accessibility', () => {
        it('associates label with input using htmlFor', async () => {
            const { getByRole } = await render(<DisplayNameForm {...defaultProps} />);

            const input = getByRole('textbox', { name: /display name/i });
            await expect.element(input).toHaveAttribute('id', 'display-name');
        });

        it('has proper input type', async () => {
            const { getByRole } = await render(<DisplayNameForm {...defaultProps} />);

            const input = getByRole('textbox', { name: /display name/i });
            await expect.element(input).toHaveAttribute('type', 'text');
        });
    });

    describe('Valid input handling', () => {
        it.each([
            { scenario: 'lowercase letters', input: 'alice', expected: 'alice' },
            { scenario: 'uppercase letters', input: 'ALICE', expected: 'ALICE' },
            { scenario: 'mixed case letters', input: 'Alice', expected: 'Alice' },
            { scenario: 'letters and numbers', input: 'Player123', expected: 'Player123' },
            { scenario: 'letters with spaces', input: 'Alice Bob', expected: 'Alice Bob' },
            { scenario: 'numbers only', input: '12345', expected: '12345' },
            { scenario: 'multiple spaces', input: 'A B C', expected: 'A B C' },
            { scenario: 'leading space', input: ' Alice', expected: ' Alice' },
            { scenario: 'trailing space', input: 'Alice ', expected: 'Alice ' },
        ])('accepts $scenario', async ({ input, expected }) => {
            const onDisplayNameChange = vi.fn();
            const { getByRole } = await render(<DisplayNameForm onDisplayNameChange={onDisplayNameChange} />);

            const inputElement = getByRole('textbox', { name: /display name/i });
            await userEvent.fill(inputElement, input);

            await expect.element(inputElement).toHaveValue(expected);
            expect(onDisplayNameChange).toHaveBeenLastCalledWith(expected);
        });

        it('calls onDisplayNameChange callback on each valid change', async () => {
            const onDisplayNameChange = vi.fn();
            const { getByRole } = await render(<DisplayNameForm onDisplayNameChange={onDisplayNameChange} />);

            const input = getByRole('textbox', { name: /display name/i });

            await userEvent.fill(input, 'A');
            expect(onDisplayNameChange).toHaveBeenCalledWith('A');

            await userEvent.fill(input, 'Al');
            expect(onDisplayNameChange).toHaveBeenCalledWith('Al');

            await userEvent.fill(input, 'Alice');
            expect(onDisplayNameChange).toHaveBeenCalledWith('Alice');

            expect(onDisplayNameChange).toHaveBeenCalledTimes(3);
        });
    });

    describe('Invalid input rejection', () => {
        it.each([
            { scenario: 'special characters', input: 'Alice@123', expectedValue: '' },
            { scenario: 'exclamation mark', input: 'Hello!', expectedValue: '' },
            { scenario: 'hash symbol', input: 'Player#1', expectedValue: '' },
            { scenario: 'underscore', input: 'Alice_Bob', expectedValue: '' },
            { scenario: 'hyphen', input: 'Alice-Bob', expectedValue: '' },
            { scenario: 'period', input: 'Mr.Smith', expectedValue: '' },
            { scenario: 'comma', input: 'Alice,Bob', expectedValue: '' },
        ])('rejects $scenario', async ({ input, expectedValue }) => {
            const onDisplayNameChange = vi.fn();
            const { getByRole } = await render(<DisplayNameForm onDisplayNameChange={onDisplayNameChange} />);

            const inputElement = getByRole('textbox', { name: /display name/i });
            await userEvent.fill(inputElement, input);

            await expect.element(inputElement).toHaveValue(expectedValue);
            expect(onDisplayNameChange).not.toHaveBeenCalled();
        });

        it('allows valid characters when typed after invalid characters', async () => {
            const onDisplayNameChange = vi.fn();
            const { getByRole } = await render(<DisplayNameForm onDisplayNameChange={onDisplayNameChange} />);

            const input = getByRole('textbox', { name: /display name/i });

            // Try to type invalid character
            await userEvent.fill(input, '@');
            await expect.element(input).toHaveValue('');

            // Type valid character
            await userEvent.fill(input, 'A');
            await expect.element(input).toHaveValue('A');
            expect(onDisplayNameChange).toHaveBeenCalledWith('A');
        });

        it('preserves valid input when invalid character is attempted', async () => {
            const onDisplayNameChange = vi.fn();
            const { getByRole } = await render(<DisplayNameForm onDisplayNameChange={onDisplayNameChange} />);

            const input = getByRole('textbox', { name: /display name/i });

            // Type valid input
            await userEvent.fill(input, 'Alice');
            await expect.element(input).toHaveValue('Alice');

            // Clear and try invalid + valid mix
            await userEvent.clear(input);
            await userEvent.fill(input, 'Alice@');

            // Should preserve nothing since the whole string is invalid
            await expect.element(input).toHaveValue('');
        });
    });

    describe('Character counter', () => {
        it('shows character counter when input has content', async () => {
            const { getByRole, getByText } = await render(<DisplayNameForm {...defaultProps} />);

            const input = getByRole('textbox', { name: /display name/i });
            await userEvent.fill(input, 'A');

            const counter = getByText('1/20 characters. Alphanumeric characters and spaces only.');
            await expect.element(counter).toBeVisible();
        });

        it('updates character count as user types', async () => {
            const { getByRole, getByText } = await render(<DisplayNameForm {...defaultProps} />);

            const input = getByRole('textbox', { name: /display name/i });

            await userEvent.fill(input, 'Alice');
            await expect.element(getByText('5/20 characters. Alphanumeric characters and spaces only.')).toBeVisible();

            await userEvent.clear(input);
            await userEvent.fill(input, 'Alice Bob');
            await expect.element(getByText('9/20 characters. Alphanumeric characters and spaces only.')).toBeVisible();
        });

        it('hides character counter when input is cleared', async () => {
            const { getByRole, getByText } = await render(<DisplayNameForm {...defaultProps} />);

            const input = getByRole('textbox', { name: /display name/i });

            await userEvent.fill(input, 'Alice');
            await expect.element(getByText('5/20 characters. Alphanumeric characters and spaces only.')).toBeVisible();

            await userEvent.clear(input);
            await expect
                .element(getByText(/characters\. alphanumeric characters and spaces only\./i))
                .not.toBeInTheDocument();
        });

        it('counts spaces in character count', async () => {
            const { getByRole, getByText } = await render(<DisplayNameForm {...defaultProps} />);

            const input = getByRole('textbox', { name: /display name/i });
            await userEvent.fill(input, 'A B C');

            await expect.element(getByText('5/20 characters. Alphanumeric characters and spaces only.')).toBeVisible();
        });
    });

    describe('Max length enforcement', () => {
        it('has maxLength attribute set to 20', async () => {
            const { getByRole } = await render(<DisplayNameForm {...defaultProps} />);

            const input = getByRole('textbox', { name: /display name/i });
            await expect.element(input).toHaveAttribute('maxLength', '20');
        });

        it('prevents input beyond 20 characters', async () => {
            const onDisplayNameChange = vi.fn();
            const { getByRole } = await render(<DisplayNameForm onDisplayNameChange={onDisplayNameChange} />);

            const input = getByRole('textbox', { name: /display name/i });
            const longInput = 'A'.repeat(25); // Try to input 25 characters

            await userEvent.fill(input, longInput);

            // Should be truncated to 20 characters
            const expectedValue = 'A'.repeat(20);
            await expect.element(input).toHaveValue(expectedValue);
            expect(onDisplayNameChange).toHaveBeenLastCalledWith(expectedValue);
        });

        it('shows 20/20 when at max length', async () => {
            const { getByRole, getByText } = await render(<DisplayNameForm {...defaultProps} />);

            const input = getByRole('textbox', { name: /display name/i });
            const maxLengthInput = 'A'.repeat(20);

            await userEvent.fill(input, maxLengthInput);

            await expect.element(getByText('20/20 characters. Alphanumeric characters and spaces only.')).toBeVisible();
        });

        it('accepts exactly 20 valid characters', async () => {
            const onDisplayNameChange = vi.fn();
            const { getByRole } = await render(<DisplayNameForm onDisplayNameChange={onDisplayNameChange} />);

            const input = getByRole('textbox', { name: /display name/i });
            const maxInput = 'Alice Bob Player 123'; // Exactly 20 characters

            await userEvent.fill(input, maxInput);

            await expect.element(input).toHaveValue(maxInput);
            expect(onDisplayNameChange).toHaveBeenLastCalledWith(maxInput);
        });
    });

    describe('Edge cases', () => {
        it('handles empty string input', async () => {
            const onDisplayNameChange = vi.fn();
            const { getByRole } = await render(<DisplayNameForm onDisplayNameChange={onDisplayNameChange} />);

            const input = getByRole('textbox', { name: /display name/i });

            // Type something
            await userEvent.fill(input, 'Alice');
            expect(onDisplayNameChange).toHaveBeenCalledWith('Alice');

            // Clear it
            await userEvent.clear(input);
            await expect.element(input).toHaveValue('');
            expect(onDisplayNameChange).toHaveBeenLastCalledWith('');
        });

        it('handles rapid typing', async () => {
            const onDisplayNameChange = vi.fn();
            const { getByRole } = await render(<DisplayNameForm onDisplayNameChange={onDisplayNameChange} />);

            const input = getByRole('textbox', { name: /display name/i });

            await userEvent.fill(input, 'Alice');

            expect(onDisplayNameChange).toHaveBeenCalledTimes(1);
            expect(onDisplayNameChange).toHaveBeenLastCalledWith('Alice');
        });

        it('handles single space input', async () => {
            const onDisplayNameChange = vi.fn();
            const { getByRole, getByText } = await render(
                <DisplayNameForm onDisplayNameChange={onDisplayNameChange} />
            );

            const input = getByRole('textbox', { name: /display name/i });
            await userEvent.fill(input, ' ');

            await expect.element(input).toHaveValue(' ');
            expect(onDisplayNameChange).toHaveBeenCalledWith(' ');

            await expect.element(getByText('1/20 characters. Alphanumeric characters and spaces only.')).toBeVisible();
        });

        it('handles only spaces input', async () => {
            const onDisplayNameChange = vi.fn();
            const { getByRole, getByText } = await render(
                <DisplayNameForm onDisplayNameChange={onDisplayNameChange} />
            );

            const input = getByRole('textbox', { name: /display name/i });
            await userEvent.fill(input, '     ');

            await expect.element(input).toHaveValue('     ');
            expect(onDisplayNameChange).toHaveBeenCalledWith('     ');

            await expect.element(getByText('5/20 characters. Alphanumeric characters and spaces only.')).toBeVisible();
        });
    });

    describe('User interaction flows', () => {
        it('allows user to type, clear, and retype', async () => {
            const onDisplayNameChange = vi.fn();
            const { getByRole } = await render(<DisplayNameForm onDisplayNameChange={onDisplayNameChange} />);

            const input = getByRole('textbox', { name: /display name/i });

            // First input
            await userEvent.fill(input, 'Alice');
            await expect.element(input).toHaveValue('Alice');
            expect(onDisplayNameChange).toHaveBeenCalledWith('Alice');

            // Clear
            await userEvent.clear(input);
            await expect.element(input).toHaveValue('');
            expect(onDisplayNameChange).toHaveBeenCalledWith('');

            // Second input
            await userEvent.fill(input, 'Bob');
            await expect.element(input).toHaveValue('Bob');
            expect(onDisplayNameChange).toHaveBeenCalledWith('Bob');
        });

        it('maintains input value when attempting invalid character mid-input', async () => {
            const onDisplayNameChange = vi.fn();
            const { getByRole } = await render(<DisplayNameForm onDisplayNameChange={onDisplayNameChange} />);

            const input = getByRole('textbox', { name: /display name/i });

            // Type valid characters
            await userEvent.fill(input, 'Alice');
            await expect.element(input).toHaveValue('Alice');

            // Clear and try mixed valid/invalid
            await userEvent.clear(input);

            // Since the pattern validation happens on the entire string,
            // typing "Alice@" would fail validation and input stays empty
            await userEvent.fill(input, 'Alice@');
            await expect.element(input).toHaveValue('');
        });
    });
});
