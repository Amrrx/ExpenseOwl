import { useState, useCallback, DragEvent } from 'react';

interface UseDragReorderResult<T> {
  dragIndex: number | null;
  dragOverIndex: number | null;
  handleDragStart: (index: number) => (e: DragEvent) => void;
  handleDragOver: (index: number) => (e: DragEvent) => void;
  handleDragEnd: () => void;
  handleDrop: (items: T[], setItems: (items: T[]) => void) => (e: DragEvent) => void;
  getDragStyles: (index: number) => string;
}

export function useDragReorder<T>(): UseDragReorderResult<T> {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const handleDragStart = useCallback((index: number) => (e: DragEvent) => {
    setDragIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index.toString());

    const target = e.target as HTMLElement;
    target.style.opacity = '0.5';
  }, []);

  const handleDragOver = useCallback((index: number) => (e: DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(index);
  }, []);

  const handleDragEnd = useCallback(() => {
    setDragIndex(null);
    setDragOverIndex(null);

    const draggables = document.querySelectorAll('[draggable="true"]');
    draggables.forEach((el) => {
      (el as HTMLElement).style.opacity = '1';
    });
  }, []);

  const handleDrop = useCallback(
    (items: T[], setItems: (items: T[]) => void) => (e: DragEvent) => {
      e.preventDefault();

      if (dragIndex === null || dragOverIndex === null || dragIndex === dragOverIndex) {
        handleDragEnd();
        return;
      }

      const reordered = [...items];
      const [removed] = reordered.splice(dragIndex, 1);
      reordered.splice(dragOverIndex, 0, removed);

      setItems(reordered);
      handleDragEnd();
    },
    [dragIndex, dragOverIndex, handleDragEnd]
  );

  const getDragStyles = useCallback(
    (index: number): string => {
      if (dragIndex === null) return '';
      if (index === dragIndex) return 'opacity-50';
      if (index === dragOverIndex) return 'ring-2 ring-primary-500 ring-offset-2';
      return '';
    },
    [dragIndex, dragOverIndex]
  );

  return {
    dragIndex,
    dragOverIndex,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
    handleDrop,
    getDragStyles,
  };
}
