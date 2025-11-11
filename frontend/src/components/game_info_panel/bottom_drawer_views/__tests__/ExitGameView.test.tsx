import type { Mock } from 'vitest';
import { userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-react';

import * as windowUtils from '../../../../utils/window';
import ExitGameView from '../ExitGameView';

vi.mock('../../../../utils/window', { spy: true });

describe('ExitGameView', () => {
    let mockReturnToMainMenu: Mock<() => void>;

    const defaultProps = {
        onDismiss: vi.fn(),
    };

    beforeEach(() => {
        mockReturnToMainMenu = vi.spyOn(windowUtils, 'returnToMainMenu').mockImplementation(() => {});
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('Render', () => {
        it('renders confirmation message', async () => {
            const { getByRole } = await render(<ExitGameView {...defaultProps} />);

            await expect.element(getByRole('heading', { name: 'Are you sure you want to quit?' })).toBeInTheDocument();
        });

        it('renders Yes button', async () => {
            const { getByRole } = await render(<ExitGameView {...defaultProps} />);

            await expect.element(getByRole('button', { name: 'Yes' })).toBeInTheDocument();
        });

        it('renders No button', async () => {
            const { getByRole } = await render(<ExitGameView {...defaultProps} />);

            await expect.element(getByRole('button', { name: 'No' })).toBeInTheDocument();
        });
    });

    describe('Yes Button', () => {
        it('auto-focuses Yes button on mount', async () => {
            const { getByRole } = await render(<ExitGameView {...defaultProps} />);

            const yesButton = getByRole('button', { name: 'Yes' });
            await expect.element(yesButton).toHaveFocus();
        });

        it('redirects to home page when clicked', async () => {
            const { getByRole } = await render(<ExitGameView {...defaultProps} />);

            const yesButton = getByRole('button', { name: 'Yes' });
            await yesButton.click();

            expect(mockReturnToMainMenu).toHaveBeenCalledTimes(1);
        });
    });

    describe('No Button', () => {
        it('calls onDismiss callback when clicked', async () => {
            const onDismiss = vi.fn();
            const { getByRole } = await render(<ExitGameView onDismiss={onDismiss} />);

            const noButton = getByRole('button', { name: 'No' });
            await noButton.click();

            expect(onDismiss).toHaveBeenCalledTimes(1);
        });
    });

    describe('Accessibility', () => {
        it('keyboard navigation works correctly', async () => {
            const onDismiss = vi.fn();
            const { getByRole } = await render(<ExitGameView onDismiss={onDismiss} />);

            // Yes button should be focused initially
            const yesButton = getByRole('button', { name: 'Yes' });
            await expect.element(yesButton).toHaveFocus();

            // Tab to No button
            await userEvent.tab();
            const noButton = getByRole('button', { name: 'No' });
            await expect.element(noButton).toHaveFocus();

            // Press Enter on No button
            await userEvent.keyboard('{Enter}');
            expect(onDismiss).toHaveBeenCalledTimes(1);
        });

        it('allows activating Yes button with Enter key', async () => {
            const { getByRole } = await render(<ExitGameView {...defaultProps} />);

            const yesButton = getByRole('button', { name: 'Yes' });
            await expect.element(yesButton).toHaveFocus();

            // Press Enter on Yes button
            await userEvent.keyboard('{Enter}');

            expect(mockReturnToMainMenu).toHaveBeenCalledTimes(1);
        });
    });
});
