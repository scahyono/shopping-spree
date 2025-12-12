import React, { useEffect, useState } from 'react';
import { describe, expect, test, vi } from 'vitest';
import { fireEvent, render, waitFor } from '@testing-library/react';
import SmartOmnibox from '../components/SmartOmnibox';

const BASE_ITEMS = [
    { id: '1', name: 'Apple', isOnShoppingList: false, isInStock: false },
    { id: '2', name: 'Apricot', isOnShoppingList: false, isInStock: false },
    { id: '3', name: 'Arugula', isOnShoppingList: false, isInStock: false },
    { id: '4', name: 'Banana', isOnShoppingList: true, isInStock: false }
];

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
            <SmartOmnibox
                items={items}
                isActive={isActive}
                activateItem={activateItem}
                createItem={createItem}
                onExistingActive={vi.fn()}
                placeholder="Search or add item..."
                actionLabel="Submit"
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

        fireEvent.change(input, { target: { value: 'Ar' } });

        await waitFor(() => {
            expect(input.value.startsWith('Ar')).toBe(true);
            expect(input.value).not.toBe('Apple');
            expect(input.selectionStart).toBe(2);
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
