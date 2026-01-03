import React, { useEffect, useRef, useState } from 'react';
import { describe, expect, test, vi } from 'vitest';
import { fireEvent, render, waitFor } from '@testing-library/react';
import useSmartOmnibox from '../hooks/useSmartOmnibox';

const BASE_ITEMS = [
    { id: '1', name: 'Apple', isOnShoppingList: false, isInStock: false },
    { id: '2', name: 'Apricot', isOnShoppingList: false, isInStock: false },
    { id: '3', name: 'Arugula', isOnShoppingList: false, isInStock: false },
    { id: '4', name: 'Banana', isOnShoppingList: true, isInStock: false }
];

function TestOmnibox({ items, isActive, activateItem, createItem, onExistingActive, onQueryChange }) {
    const inputRef = useRef(null);

    const { value, handleChange, handleKeyDown, handleSubmit } = useSmartOmnibox({
        items,
        isActive,
        activateItem,
        createItem,
        onExistingActive,
        onQueryChange,
        inputRef,
    });

    return (
        <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
            <input
                ref={inputRef}
                placeholder="Search or add item..."
                aria-label="Search or add item"
                value={value}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
            />
        </form>
    );
}

function renderHarness({
    initialItems = BASE_ITEMS,
    isActive = (item) => item.isOnShoppingList,
    activateKey = 'isOnShoppingList',
    onQueryChange,
} = {}) {
    const itemsRef = { current: initialItems };
    let idCounter = initialItems.length + 1;

    const Harness = () => {
        const [items, setItems] = useState(initialItems);
        const createItem = (name) => {
            const newItem = { id: `${idCounter++}`, name, isOnShoppingList: false, isInStock: false };
            setItems(prev => [...prev, newItem]);
            return newItem;
        };

        const activateItem = (item) => {
            setItems(prev => prev.map(existing => existing.id === item.id
                ? { ...existing, [activateKey]: true, activatedAt: Date.now() }
                : existing
            ));
        };

        useEffect(() => {
            itemsRef.current = items;
        }, [items]);

        return (
            <TestOmnibox
                items={items}
                isActive={isActive}
                activateItem={activateItem}
                createItem={createItem}
                onExistingActive={vi.fn()}
                onQueryChange={onQueryChange}
            />
        );
    };

    const utils = render(<Harness />);
    const input = utils.getByPlaceholderText(/search or add item/i);
    return { ...utils, input, itemsRef };
}

describe('SmartOmnibox', () => {
    test('should_autocomplete_and_select_suffix', async () => {
        const { input } = renderHarness();

        fireEvent.change(input, { target: { value: 'A' } });

        await waitFor(() => {
            expect(input.value).toBe('Apple');
            expect(input.selectionStart).toBe(1);
            expect(input.selectionEnd).toBe(5);
        });
    });

    test('should_replace_selection_on_continue_typing', async () => {
        const { input } = renderHarness();

        fireEvent.change(input, { target: { value: 'A' } });
        await waitFor(() => expect(input.value).toBe('Apple'));

        fireEvent.change(input, { target: { value: 'Ar' }, nativeEvent: { inputType: 'insertText' } });

        await waitFor(() => {
            expect(input.value.startsWith('Ar')).toBe(true);
            expect(input.value).not.toBe('Apple');
            expect(input.selectionStart).toBe(2);
        });
    });

    test('typing_one_character_should_restart_autocomplete', async () => {
        const { input } = renderHarness();

        fireEvent.change(input, { target: { value: 'A' }, nativeEvent: { inputType: 'insertText' } });
        await waitFor(() => expect(input.value).toBe('Apple'));

        fireEvent.change(input, { target: { value: 'Ap' }, nativeEvent: { inputType: 'insertText' } });

        await waitFor(() => {
            expect(input.value).toBe('Ap');
            expect(input.selectionStart).toBe(2);
            expect(input.selectionEnd).toBe(2);
        });
    });

    test('typing_should_discard_previous_autocomplete_suffix', async () => {
        const { input } = renderHarness({
            initialItems: [
                { id: '1', name: 'Cream', isOnShoppingList: false, isInStock: false },
                { id: '2', name: 'Cheese', isOnShoppingList: false, isInStock: false },
            ],
        });

        fireEvent.change(input, { target: { value: 'C' }, nativeEvent: { inputType: 'insertText' } });
        await waitFor(() => {
            expect(input.value).toBe('Cream');
            expect(input.selectionStart).toBe(1);
            expect(input.selectionEnd).toBe(5);
        });

        fireEvent.change(input, { target: { value: 'Ch' }, nativeEvent: { inputType: 'insertText' } });

        await waitFor(() => {
            expect(input.value.startsWith('Ch')).toBe(true);
            expect(input.value).not.toBe('Cream');
            expect(input.selectionStart).toBe(2);
            expect(input.selectionEnd).toBe(2);
        });
    });

    test('typing_should_use_prefix_before_cursor_when_suffix_was_autocompleted', async () => {
        const { input } = renderHarness({
            initialItems: [
                { id: '1', name: 'Cream', isOnShoppingList: false, isInStock: false },
                { id: '2', name: 'Cheese', isOnShoppingList: false, isInStock: false },
            ],
        });

        fireEvent.change(input, { target: { value: 'C' }, nativeEvent: { inputType: 'insertText' } });
        await waitFor(() => {
            expect(input.value).toBe('Cream');
            expect(input.selectionStart).toBe(1);
            expect(input.selectionEnd).toBe(5);
        });

        fireEvent.change(input, {
            target: {
                value: 'Cheam',
                selectionStart: 2,
                selectionEnd: 2,
            },
            nativeEvent: { inputType: 'insertText' },
        });

        await waitFor(() => {
            expect(input.value).toBe('Ch');
            expect(input.selectionStart).toBe(2);
            expect(input.selectionEnd).toBe(2);
        });
    });

    test('backspace_should_remove_selection_only', async () => {
        const { input } = renderHarness();

        fireEvent.change(input, { target: { value: 'A' } });
        await waitFor(() => expect(input.selectionEnd).toBeGreaterThan(1));

        fireEvent.keyDown(input, { key: 'Backspace' });

        await waitFor(() => {
            expect(input.value).toBe('A');
            expect(input.selectionStart).toBe(1);
            expect(input.selectionEnd).toBe(1);
        });
    });

    test('backspace_should_pause_autocomplete_until_next_input', async () => {
        const { input } = renderHarness();

        fireEvent.change(input, { target: { value: 'Apple' } });
        await waitFor(() => expect(input.value).toBe('Apple'));

        fireEvent.keyDown(input, { key: 'Backspace' });
        fireEvent.input(input, {
            target: { value: 'Appl' },
            nativeEvent: { inputType: 'deleteContentBackward' },
        });

        await waitFor(() => {
            expect(input.value).toBe('Appl');
            expect(input.selectionStart).toBe(4);
            expect(input.selectionEnd).toBe(4);
        });

        fireEvent.input(input, {
            target: { value: 'Apple' },
            nativeEvent: { inputType: 'insertText' },
        });

        await waitFor(() => {
            expect(input.value).toBe('Apple');
            expect(input.selectionStart).toBe(5);
            expect(input.selectionEnd).toBe(5);
        });
    });

    test('typing_after_backspace_should_not_replace_word', async () => {
        const { input } = renderHarness();

        fireEvent.change(input, { target: { value: 'A' }, nativeEvent: { inputType: 'insertText' } });
        await waitFor(() => expect(input.value).toBe('Apple'));

        fireEvent.keyDown(input, { key: 'Backspace' });
        fireEvent.input(input, {
            target: { value: 'A' },
            nativeEvent: { inputType: 'deleteContentBackward' },
        });

        await waitFor(() => {
            expect(input.value).toBe('A');
            expect(input.selectionStart).toBe(1);
            expect(input.selectionEnd).toBe(1);
        });

        fireEvent.change(input, { target: { value: 'Ap' }, nativeEvent: { inputType: 'insertText' } });

        await waitFor(() => {
            expect(input.value).toBe('Ap');
            expect(input.selectionStart).toBe(2);
            expect(input.selectionEnd).toBe(2);
        });

        fireEvent.change(input, { target: { value: 'App' }, nativeEvent: { inputType: 'insertText' } });

        await waitFor(() => {
            expect(input.value).toBe('Apple');
            expect(input.selectionStart).toBe(3);
            expect(input.selectionEnd).toBe(5);
        });
    });

    test('enter_should_restore_hidden_item', async () => {
        const { input, itemsRef } = renderHarness();

        fireEvent.change(input, { target: { value: 'Apple' } });
        await waitFor(() => expect(input.value).toBe('Apple'));

        fireEvent.keyDown(input, { key: 'Enter' });

        await waitFor(() => {
            const restored = itemsRef.current.find(item => item.id === '1');
            expect(restored.isOnShoppingList).toBe(true);
        });
    });

    test('enter_should_not_duplicate_active_item', async () => {
        const { input, itemsRef } = renderHarness({ initialItems: BASE_ITEMS });

        fireEvent.change(input, { target: { value: 'Banana' } });
        await waitFor(() => expect(input.value).toBe('Banana'));

        const startingLength = itemsRef.current.length;
        fireEvent.keyDown(input, { key: 'Enter' });

        await waitFor(() => {
            expect(itemsRef.current.length).toBe(startingLength);
            expect(itemsRef.current.find(item => item.name === 'Banana').isOnShoppingList).toBe(true);
        });
    });

    test('typing_space_should_keep_input_intact', async () => {
        const { input } = renderHarness({
            initialItems: [
                { id: '1', name: 'Baking Soda', isOnShoppingList: false, isInStock: false },
                { id: '2', name: 'Baking Powder', isOnShoppingList: false, isInStock: false },
            ],
        });

        fireEvent.change(input, { target: { value: 'Baking' }, nativeEvent: { inputType: 'insertText' } });

        await waitFor(() => {
            expect(input.value).toBe('Baking Soda');
            expect(input.selectionStart).toBe(6);
            expect(input.selectionEnd).toBe(11);
        });

        fireEvent.change(input, {
            target: {
                value: 'Baking ',
                selectionStart: 7,
                selectionEnd: 7,
            },
            nativeEvent: { inputType: 'insertText' },
        });

        await waitFor(() => {
            expect(input.value.startsWith('Baking ')).toBe(true);
            expect(input.selectionStart).toBe(7);
            expect(input.selectionEnd).toBeGreaterThanOrEqual(7);
        });
    });

    test('typing_space_in_empty_input_should_preserve_value', async () => {
        const { input } = renderHarness({ initialItems: BASE_ITEMS });

        fireEvent.change(input, {
            target: { value: ' ', selectionStart: 1, selectionEnd: 1 },
            nativeEvent: { inputType: 'insertText' },
        });

        await waitFor(() => {
            expect(input.value).toBe(' ');
            expect(input.selectionStart).toBe(1);
            expect(input.selectionEnd).toBe(1);
        });
    });

    test('typing_multiword_item_keeps_progress_after_space', async () => {
        const { input } = renderHarness({
            initialItems: [
                { id: '1', name: 'Baking Soda', isOnShoppingList: false, isInStock: false },
                { id: '2', name: 'Baking Powder', isOnShoppingList: false, isInStock: false },
            ],
        });

        const typeValue = async (value) => {
            fireEvent.change(input, {
                target: { value, selectionStart: value.length, selectionEnd: value.length },
                nativeEvent: { inputType: 'insertText' },
            });

            await waitFor(() => {
                expect(input.value.length).toBeGreaterThan(0);
            });
        };

        await typeValue('B');
        await typeValue('Ba');
        await typeValue('Bak');
        await typeValue('Baki');
        await typeValue('Bakin');
        await typeValue('Baking');

        await waitFor(() => {
            expect(input.value.toLowerCase().startsWith('baking')).toBe(true);
        });

        await typeValue('Baking ');

        await waitFor(() => {
            expect(input.value).toBe('Baking ');
            expect(input.selectionStart).toBe(7);
            expect(input.selectionEnd).toBe(7);
        });

        await typeValue('Baking P');
        await typeValue('Baking Po');
        await typeValue('Baking Pow');

        await waitFor(() => {
            expect(input.value.toLowerCase().startsWith('baking pow')).toBe(true);
            expect(input.selectionStart).toBeGreaterThanOrEqual(9);
        });
    });

    test('typing_multiword_item_with_hidden_sibling_should_not_reset_after_space', async () => {
        const { input } = renderHarness({
            initialItems: [
                { id: '1', name: 'Baking Powder', isOnShoppingList: false, isInStock: true },
                { id: '2', name: 'Baking Paper', isOnShoppingList: false, isInStock: false },
            ],
        });

        fireEvent.change(input, { target: { value: 'Baking' }, nativeEvent: { inputType: 'insertText' } });

        await waitFor(() => {
            expect(input.value.toLowerCase().startsWith('baking')).toBe(true);
        });

        fireEvent.change(input, {
            target: {
                value: 'Baking ',
                selectionStart: 7,
                selectionEnd: 7,
            },
            nativeEvent: { inputType: 'insertText' },
        });

        await waitFor(() => {
            expect(input.value).toBe('Baking ');
            expect(input.selectionStart).toBe(7);
            expect(input.selectionEnd).toBe(7);
        });

        fireEvent.change(input, {
            target: {
                value: 'Baking P',
                selectionStart: 8,
                selectionEnd: 8,
            },
            nativeEvent: { inputType: 'insertText' },
        });

        await waitFor(() => {
            expect(input.value).toBe('Baking P');
            expect(input.selectionStart).toBe(8);
            expect(input.selectionEnd).toBe(8);
        });

        const continueTyping = async (nextValue) => {
            fireEvent.change(input, {
                target: { value: nextValue, selectionStart: nextValue.length, selectionEnd: nextValue.length },
                nativeEvent: { inputType: 'insertText' },
            });

            await waitFor(() => {
                expect(input.value.toLowerCase().startsWith(nextValue.toLowerCase())).toBe(true);
            });
        };

        await continueTyping('Baking Po');
        await continueTyping('Baking Pow');
        await continueTyping('Baking Powd');
        await continueTyping('Baking Powde');
        await continueTyping('Baking Powder');

        await waitFor(() => {
            expect(input.value).toBe('Baking Powder');
            expect(input.selectionStart).toBe(13);
            expect(input.selectionEnd).toBe(13);
        });
    });

    test('typing_and_creating_new_item_with_hidden_sibling_preserves_progress', async () => {
        const { input, itemsRef } = renderHarness({
            initialItems: [
                { id: '1', name: 'Baking Paper', isOnShoppingList: false, isInStock: false },
            ],
        });

        const typeValue = async (value, { expectExact } = {}) => {
            fireEvent.change(input, {
                target: { value, selectionStart: value.length, selectionEnd: value.length },
                nativeEvent: { inputType: 'insertText' },
            });

            await waitFor(() => {
                if (expectExact) {
                    expect(input.value).toBe(value);
                    expect(input.selectionStart).toBe(value.length);
                    expect(input.selectionEnd).toBe(value.length);
                    return;
                }

                expect(input.value.toLowerCase().startsWith(value.toLowerCase())).toBe(true);
                expect(input.selectionStart).toBe(value.length);
            });
        };

        await typeValue('B');
        await typeValue('Ba');
        await typeValue('Bak');
        await typeValue('Baki');
        await typeValue('Bakin');
        await typeValue('Baking');

        await typeValue('Baking ', { expectExact: true });

        await typeValue('Baking P');
        await typeValue('Baking Po');
        await typeValue('Baking Pow');
        await typeValue('Baking Powd');
        await typeValue('Baking Powde');
        await typeValue('Baking Powder');

        expect(itemsRef.current.find(item => item.name === 'Baking Powder')).toBeUndefined();

        fireEvent.keyDown(input, { key: 'Enter' });

        await waitFor(() => {
            const created = itemsRef.current.find(item => item.name === 'Baking Powder');
            expect(created).toBeDefined();
            expect(created.isOnShoppingList).toBe(true);
        });
    });

    test('onQueryChange_receives_raw_query_with_trailing_space', async () => {
        const onQueryChange = vi.fn();
        const { input } = renderHarness({
            initialItems: [
                { id: '1', name: 'Baking Soda', isOnShoppingList: false, isInStock: false },
                { id: '2', name: 'Baking Powder', isOnShoppingList: false, isInStock: false },
            ],
            onQueryChange,
        });

        fireEvent.change(input, { target: { value: 'Baking' }, nativeEvent: { inputType: 'insertText' } });

        await waitFor(() => {
            expect(onQueryChange).toHaveBeenLastCalledWith('Baking');
        });

        fireEvent.change(input, {
            target: {
                value: 'Baking ',
                selectionStart: 7,
                selectionEnd: 7,
            },
            nativeEvent: { inputType: 'insertText' },
        });

        await waitFor(() => {
            expect(onQueryChange).toHaveBeenLastCalledWith('Baking ');
        });
    });

    test('onQueryChange_preserves_whitespace_only_queries', async () => {
        const onQueryChange = vi.fn();
        const { input } = renderHarness({ onQueryChange });

        fireEvent.change(input, {
            target: { value: ' ', selectionStart: 1, selectionEnd: 1 },
            nativeEvent: { inputType: 'insertText' },
        });

        await waitFor(() => {
            expect(onQueryChange).toHaveBeenLastCalledWith(' ');
        });
    });
});
