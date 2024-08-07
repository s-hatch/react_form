import styles from './DropdownInput.module.scss';
import { DropdownInputProps } from '@/types/interfaces';
import { useState, useRef, useContext, useCallback, useEffect } from 'react';
import { FormContext } from '../form_context/page';
import useManageListeners from '@/app/manage_listeners';

export default function DropdownInput({ componentName, inputFor, items, labelText }: DropdownInputProps) {
    const [isListHidden, setIsListHidden] = useState(true);
    const [itemList, setItemList] = useState<string[]>([]); // For filtering (and displaying) list items
    const itemListRef = useRef<HTMLUListElement>(null); // For navigating the ul
    const inputRef = useRef<HTMLInputElement>(null); // Used to put back focus on input element
    const listIndex = useRef(-1); // For applying CSS styling to highlight the current focues (button) element
    const { getValue, setValue, getError } = useContext(FormContext);
    const value = getValue(inputFor);
    const errorObj = getError(value?.errors);
    const [addListeners, removeListeners] = useManageListeners();

    const cachedClickCloseItemList = useCallback(
        (e: Event): void => {
            // To make the menu close by clicking outside its area
            if (!itemListRef.current) {
                removeListeners(['cachedClickCloseItemList', 'cachedEscCloseItemList']);
            } else if (!itemListRef.current?.contains(e.target as Node) && !inputRef.current?.contains(e.target as Node)) {
                // If click is outside both the menu or (logically AND) the input element, close the menu
                setIsListHidden(true);
                removeListeners(['cachedClickCloseItemList', 'cachedEscCloseItemList']);
            }
        }, [itemListRef, setIsListHidden, removeListeners]
    )

    const cachedEscCloseItemList = useCallback(
        // Close with Escape key
        (e: Event): void => {
            if (!itemListRef) {
                removeListeners(['cachedClickCloseItemList', 'cachedEscCloseItemList']);
            } else if ((e as KeyboardEvent).key === 'Escape') {
                setIsListHidden(true);
                removeListeners(['cachedClickCloseItemList', 'cachedEscCloseItemList']);
            }
        }, [itemListRef, setIsListHidden, removeListeners]
    )

    useEffect(() => {
        if (!isListHidden) {
            // Add listeners if menu is visible
            addListeners([
                {name: 'cachedClickCloseItemList', eventType: 'click', callback: cachedClickCloseItemList, useCapture: false},
                {name: 'cachedEscCloseItemList', eventType: 'keydown', callback: cachedEscCloseItemList, useCapture: false}
            ]);
        }
    }, [isListHidden, cachedClickCloseItemList, cachedEscCloseItemList, addListeners])

    function handleUserInput(e: React.ChangeEvent<HTMLInputElement>) {
        e.target.value.length > 0 ? setIsListHidden(false) : setIsListHidden(true); // Display the list if the user types anything
        listIndex.current = -1; // Reset the index used for keyboard navigation
        setValue('state', e.target.value); // Display what the user types real-time

        // Filter the list based on what the user has typed and store it in state
        let filteredList = items.filter(item => item.toLowerCase().startsWith(e.target.value.toLowerCase()));
        setItemList(filteredList);
    }

    function handleItemSelection(e: React.MouseEvent<HTMLButtonElement>) {
        e.preventDefault();
        setValue(inputFor, (e.target as HTMLButtonElement).value);
        inputRef.current?.focus();
        setIsListHidden(true);
        listIndex.current = -1; // Reset so when the user starts deleting text the old index won't cause that <li> to highlight
    }

    function handleReopenList(e: React.FocusEvent<HTMLInputElement> | React.MouseEvent<HTMLInputElement>) {
        e.stopPropagation();
        if (value?.value?.length > 0) {
            // Only open if text is present
            setIsListHidden(false);
        }
    }

    function handleArrowNav(e: React.KeyboardEvent<HTMLInputElement | HTMLButtonElement>) {
        // preventDefault() is needed because the list may have a scrollbar and default behavior for arrow keys is to scroll
        if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (listIndex.current > 0 ) {
                // navigate list using listIndex
                listIndex.current--;
                (itemListRef.current?.children[listIndex.current]?.firstElementChild as HTMLElement).focus();
            } else if (listIndex.current === 0) {
                // Returns focus to the input element
                inputRef.current?.focus();
                listIndex.current = -1;
            }
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (listIndex.current < itemList?.length - 1) {
                // if list is open track navigation with listIndex
                listIndex.current++;
                (itemListRef.current?.children[listIndex.current]?.firstElementChild as HTMLElement).focus();
            }
        }
    }

    function handleTabNav(e: React.KeyboardEvent<HTMLInputElement>) {
        // Tab navigation will put focus on previous or next element, so close the list if it's open
        if ((e.shiftKey && e.key === 'Tab') || e.key === 'Tab') {
            if (!isListHidden) setIsListHidden(true);
        }
    }

    return (
        <div className={[`${componentName}_${inputFor}InputDiv`, styles.dropdownContainer].join(' ')} data-testid='dropdown-container'>
            <label htmlFor={`${inputFor}Input-id`} className={styles.dropdownInputLabel}>
                {labelText}
            </label>
            <input
                ref={inputRef}
                id={`${inputFor}Input-id`}
                type="text"
                autoComplete='off'
                className={errorObj?.isError ? [styles.dropdownInput, 'errorOutline'].join(' ') : styles.dropdownInput}
                name={inputFor}
                value={value?.value ?? ''}
                onChange={handleUserInput}
                onKeyDown={(e) => {
                    handleArrowNav(e);
                    handleTabNav(e);
                }}
                onFocus={handleReopenList}
                onClick={handleReopenList}
                role='combobox'
                aria-controls='dropdown-input-ul'
                aria-expanded={isListHidden ? 'false' : 'true'}
                aria-autocomplete='list'
                aria-required='true'
                aria-invalid={errorObj?.isError ? 'true' : 'false'}
                aria-errormessage={errorObj?.isError ? `${inputFor}-errorMsg-id` : ''}
            />
            <ul
                id='dropdown-input-ul'
                ref={itemListRef}
                className={styles.dropdownList}
                hidden={itemList.length === 0 || isListHidden}
                role='listbox'
            >
                {itemList?.map(item =>
                    <li key={item}>
                        <button
                            className={styles.itemButton}
                            onClick={handleItemSelection}
                            onKeyDown={handleArrowNav}
                            value={item}
                        >{item}</button>
                    </li>
                )}
            </ul>
            {errorObj?.isError && <div id={`${inputFor}-errorMsg-id`} className={styles.incorrectInputErrorMsg}>{ errorObj?.errorMsg }</div>}
        </div>
    )
}
