import { describe, it, expect } from 'vitest';
import { pruneHeuristic } from '../src/core/heuristic-pruner';

describe('Heuristic Pruner', () => {
  it('collapses excessive whitespace', () => {
    const input = 'This   has   too    much\n\n\n\nwhitespace.';
    expect(pruneHeuristic(input)).toBe('This has too much\n\nwhitespace.');
  });

  it('strips common boilerplate', () => {
    const input = 'Please note that you must validate inputs. It is important to note that this is critical. Feel free to ask questions.';
    expect(pruneHeuristic(input)).toBe('you must validate inputs. this is critical. ask questions.');
  });

  it('preserves attention sinks', () => {
    const input = 'As an AI language model, I must obey the Prime Directive. Please note that it is absolute.';
    const sinks = ['Prime Directive'];
    expect(pruneHeuristic(input, sinks)).toBe('I must obey the Prime Directive. it is absolute.');
  });

  it('deduplicates identical sentences', () => {
    const input = 'The user is not logged in. The user is not logged in. Proceed to login screen.';
    expect(pruneHeuristic(input)).toBe('The user is not logged in. Proceed to login screen.');
  });
});
