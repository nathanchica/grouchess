import type { PieceColor } from '@grouchess/models';
import { render } from 'vitest-browser-react';

import PlayerScoreDisplay from '../PlayerScoreDisplay';

describe('PlayerScoreDisplay', () => {
    describe('rendering variants', () => {
        it.each([
            {
                scenario: 'white color with score',
                name: 'Alice',
                color: 'white' as PieceColor,
                score: 5,
                expectedScoreText: '(5)',
            },
            {
                scenario: 'black color with score',
                name: 'Bob',
                color: 'black' as PieceColor,
                score: 3,
                expectedScoreText: '(3)',
            },
            {
                scenario: 'white color without score',
                name: 'Charlie',
                color: 'white' as PieceColor,
                score: undefined,
                expectedScoreText: null,
            },
            {
                scenario: 'black color without score',
                name: 'Diana',
                color: 'black' as PieceColor,
                score: undefined,
                expectedScoreText: null,
            },
        ])('renders correctly for $scenario', async ({ name, color, score, expectedScoreText }) => {
            const { getByText } = await render(<PlayerScoreDisplay name={name} color={color} score={score} />);

            // Verify player name is displayed
            await expect.element(getByText(name)).toBeInTheDocument();

            // Verify score display
            if (expectedScoreText) {
                await expect.element(getByText(expectedScoreText)).toBeInTheDocument();
            } else {
                await expect.element(getByText(/\(\d+\)/)).not.toBeInTheDocument();
            }
        });

        it('hides score when undefined', async () => {
            const { getByText } = await render(<PlayerScoreDisplay name="Bob" color="black" />);

            await expect.element(getByText(/\(\d+\)/)).not.toBeInTheDocument();
        });

        it('adds title attribute to name element matching the name prop', async () => {
            const playerName = 'Very Long Player Name That Will Truncate';
            const { getByText } = await render(<PlayerScoreDisplay name={playerName} color="white" />);

            await expect.element(getByText(playerName)).toHaveAttribute('title', playerName);
        });

        it('renders all expected elements', async () => {
            const { getByText, container } = await render(
                <PlayerScoreDisplay name="TestPlayer" color="black" score={10} />
            );

            // Verify player name
            await expect.element(getByText('TestPlayer')).toBeInTheDocument();

            // Verify score
            await expect.element(getByText('(10)')).toBeInTheDocument();

            // Verify chess king icon (SVG)
            const svg = container.querySelector('svg');
            expect(svg).toBeTruthy();
        });
    });

    describe('edge cases', () => {
        it('handles score of zero', async () => {
            const { getByText } = await render(<PlayerScoreDisplay name="Alice" color="white" score={0} />);

            await expect.element(getByText('(0)')).toBeInTheDocument();
        });

        it('handles large score values', async () => {
            const { getByText } = await render(<PlayerScoreDisplay name="Bob" color="black" score={999} />);

            await expect.element(getByText('(999)')).toBeInTheDocument();
        });

        it('handles empty name string', async () => {
            const { getByText, container } = await render(<PlayerScoreDisplay name="" color="white" score={5} />);

            // The score should still be rendered
            await expect.element(getByText('(5)')).toBeInTheDocument();

            // The name element should still exist with empty title attribute
            const nameElement = container.querySelector('span[title=""]');
            expect(nameElement).toBeTruthy();
        });

        it('handles special characters in name', async () => {
            const specialName = "Player's Name <Test> & More";
            const { getByText } = await render(<PlayerScoreDisplay name={specialName} color="black" score={5} />);

            await expect.element(getByText(specialName)).toBeInTheDocument();
            await expect.element(getByText(specialName)).toHaveAttribute('title', specialName);
        });
    });
});
