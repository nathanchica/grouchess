import type { GetTimeControlOptionsResponse } from '@grouchess/http-schemas';
import { createMockTimeControl } from '@grouchess/test-utils';
import { page, userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-react';

import { _resetPromiseCacheForTesting, fetchWithSchemasOrThrow } from '../../../../utils/fetch';
import TimeControlForm from '../TimeControlForm';

vi.mock('../../../../utils/fetch', async () => {
    const actual = await vi.importActual('../../../../utils/fetch');
    return {
        ...actual,
        fetchWithSchemasOrThrow: vi.fn(),
    };
});

const fetchWithSchemasOrThrowMock = vi.mocked(fetchWithSchemasOrThrow);

const mockGetTimeControlOptionsResponse: GetTimeControlOptionsResponse = {
    supportedTimeControls: [
        createMockTimeControl({ alias: '3|2', minutes: 3, increment: 2, displayText: '3|2' }),
        createMockTimeControl({ alias: '5|0', minutes: 5, increment: 0, displayText: '5 min' }),
        createMockTimeControl({ alias: '10|0', minutes: 10, increment: 0, displayText: '10 min' }),
    ],
};

const defaultProps = {
    onTimeControlSelect: vi.fn(),
};

afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    _resetPromiseCacheForTesting();
});

describe('TimeControlForm', () => {
    describe('Initial state', () => {
        it('renders the time control heading', async () => {
            fetchWithSchemasOrThrowMock.mockResolvedValue(mockGetTimeControlOptionsResponse);

            const { getByRole } = await render(<TimeControlForm {...defaultProps} />);

            const heading = getByRole('heading', { name: /time control/i, level: 2 });
            await expect.element(heading).toBeInTheDocument();
        });
    });

    describe('Loading State (Suspense Fallback)', () => {
        beforeEach(() => {
            // Delay the fetch response to observe the loading state
            const delayedFetchPromise = new Promise<GetTimeControlOptionsResponse>((resolve) => {
                setTimeout(() => resolve(mockGetTimeControlOptionsResponse), 100);
            });
            fetchWithSchemasOrThrowMock.mockReturnValue(delayedFetchPromise);
        });

        it('shows shimmer loading state while fetching time control options', async () => {
            const { getByRole } = await render(<TimeControlForm {...defaultProps} />);

            const loadingStatus = getByRole('status', { name: /loading time control options/i });
            await expect.element(loadingStatus).toBeInTheDocument();
        });

        it('transitions from loading to loaded state', async () => {
            const { getByRole } = await render(<TimeControlForm {...defaultProps} />);

            // Verify shimmer loading state is initially visible
            const loadingStatus = getByRole('status', { name: /loading time control options/i });
            await expect.element(loadingStatus).toBeInTheDocument();

            // Wait for loading state to disappear and content to load
            await expect.element(loadingStatus).not.toBeInTheDocument();

            // Verify actual content is now displayed
            const timeControlOptions = getByRole('group', { name: /time control options/i });
            await expect.element(timeControlOptions).toBeInTheDocument();
        });
    });

    describe('Error State (ErrorBoundary)', () => {
        it.each([
            {
                scenario: 'fetch fails with error',
                setup: () => {
                    fetchWithSchemasOrThrowMock.mockRejectedValue(new Error('Failed to fetch time control options.'));
                },
                expectedError: 'Failed to fetch time control options.',
            },
        ])('shows error when $scenario', async ({ setup, expectedError }) => {
            vi.spyOn(console, 'error').mockImplementation(() => {}); // Suppress error boundary logging
            setup();

            const { getByRole } = await render(<TimeControlForm {...defaultProps} />);

            const errorAlert = getByRole('alert');
            await expect.element(errorAlert).toBeInTheDocument();
            await expect.element(errorAlert).toHaveTextContent(expectedError);
        });
    });

    describe('Successful Data Loading and User Interactions', () => {
        beforeEach(() => {
            fetchWithSchemasOrThrowMock.mockResolvedValue(mockGetTimeControlOptionsResponse);
        });

        it('displays fetched time control options', async () => {
            const { getByRole } = await render(<TimeControlForm {...defaultProps} />);

            // Verify all three fetched time controls are displayed
            const option1 = getByRole('radio', { name: /3\|2 time control option/i });
            const option2 = getByRole('radio', { name: /5 min time control option/i });
            const option3 = getByRole('radio', { name: /10 min time control option/i });

            await expect.element(option1).toBeInTheDocument();
            await expect.element(option2).toBeInTheDocument();
            await expect.element(option3).toBeInTheDocument();
        });

        it('displays unlimited time option and is checked by default', async () => {
            const { getByRole } = await render(<TimeControlForm {...defaultProps} />);

            const unlimitedOption = getByRole('radio', { name: /unlimited time control option/i });
            await expect.element(unlimitedOption).toBeInTheDocument();
            await expect.element(unlimitedOption).toBeChecked();
        });

        it.each([
            {
                scenario: 'selecting a time control option',
                optionLabel: '5 min',
                expectedTimeControl: createMockTimeControl({
                    alias: '5|0',
                    minutes: 5,
                    increment: 0,
                    displayText: '5 min',
                }),
                needsInitialClick: false,
            },
            {
                scenario: 'selecting unlimited option',
                optionLabel: 'Unlimited',
                expectedTimeControl: null,
                needsInitialClick: true, // Need to click a different option first since unlimited is selected by default
            },
        ])(
            'calls onTimeControlSelect when $scenario',
            async ({ optionLabel, expectedTimeControl, needsInitialClick }) => {
                const onTimeControlSelect = vi.fn();
                await render(<TimeControlForm onTimeControlSelect={onTimeControlSelect} />);

                if (needsInitialClick) {
                    // Click a different option first to deselect the current selection
                    await page.getByText('10 min', { exact: true }).click();
                    onTimeControlSelect.mockClear();
                }

                // Click on the visible text label instead of the hidden radio button
                await page.getByText(optionLabel, { exact: true }).click();

                expect(onTimeControlSelect).toHaveBeenCalledTimes(1);
                expect(onTimeControlSelect).toHaveBeenCalledWith(expectedTimeControl);
            }
        );

        it('updates selection state when different options are clicked', async () => {
            const { getByRole } = await render(<TimeControlForm {...defaultProps} />);

            const option1 = getByRole('radio', { name: /5 min time control option/i });
            const option2 = getByRole('radio', { name: /10 min time control option/i });
            const unlimitedOption = getByRole('radio', { name: /unlimited time control option/i });

            // Initially unlimited option is selected
            await expect.element(option1).not.toBeChecked();
            await expect.element(option2).not.toBeChecked();
            await expect.element(unlimitedOption).toBeChecked();

            // Click first option (click on visible text label instead of hidden radio)
            await page.getByText('5 min', { exact: true }).click();
            await expect.element(option1).toBeChecked();
            await expect.element(option2).not.toBeChecked();
            await expect.element(unlimitedOption).not.toBeChecked();

            // Click second option
            await page.getByText('10 min', { exact: true }).click();
            await expect.element(option1).not.toBeChecked();
            await expect.element(option2).toBeChecked();
            await expect.element(unlimitedOption).not.toBeChecked();

            // Click back to unlimited option
            await page.getByText('Unlimited', { exact: true }).click();
            await expect.element(option1).not.toBeChecked();
            await expect.element(option2).not.toBeChecked();
            await expect.element(unlimitedOption).toBeChecked();
        });
    });

    describe('Accessibility', () => {
        beforeEach(() => {
            fetchWithSchemasOrThrowMock.mockResolvedValue(mockGetTimeControlOptionsResponse);
        });

        it('time control options are accessible via keyboard', async () => {
            const { getByRole } = await render(<TimeControlForm {...defaultProps} />);

            // Get all radio buttons
            const unlimitedOption = getByRole('radio', { name: /unlimited time control option/i });
            const option1 = getByRole('radio', { name: /3\|2 time control option/i });
            const option2 = getByRole('radio', { name: /5 min time control option/i });
            const option3 = getByRole('radio', { name: /10 min time control option/i });

            // Tab to focus the radio group (should focus the checked radio - unlimited by default)
            await userEvent.tab();
            await expect.element(unlimitedOption).toHaveFocus();
            await expect.element(unlimitedOption).toBeChecked();

            // Use ArrowDown to navigate to next option
            await userEvent.keyboard('{ArrowDown}');
            await expect.element(option1).toHaveFocus();
            await expect.element(option1).toBeChecked();

            // Use ArrowDown again to navigate to next option
            await userEvent.keyboard('{ArrowDown}');
            await expect.element(option2).toHaveFocus();
            await expect.element(option2).toBeChecked();

            // Use ArrowDown again to navigate to next option
            await userEvent.keyboard('{ArrowDown}');
            await expect.element(option3).toHaveFocus();
            await expect.element(option3).toBeChecked();

            // Use ArrowUp to navigate back
            await userEvent.keyboard('{ArrowUp}');
            await expect.element(option2).toHaveFocus();
            await expect.element(option2).toBeChecked();

            // Use ArrowUp again
            await userEvent.keyboard('{ArrowUp}');
            await expect.element(option1).toHaveFocus();
            await expect.element(option1).toBeChecked();
        });
    });
});
