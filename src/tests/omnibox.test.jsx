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
    activateKey = 'isOnShoppingList'
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
});
