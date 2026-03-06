import { Injectable, Signal, computed, signal } from '@angular/core';

export type ToastVariant = 'success' | 'error' | 'warning' | 'info';

export interface ToastMessage {
  id: number;
  title?: string;
  message: string;
  variant: ToastVariant;
  durationMs: number;
  closing?: boolean;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  private readonly state = signal<ToastMessage[]>([]);
  private readonly timers = new Map<number, number>();
  private readonly removeTimers = new Map<number, number>();
  private readonly leaveAnimationMs = 220;
  private sequence = 0;

  readonly toasts: Signal<ToastMessage[]> = computed(() => this.state());

  success(message: string, title = 'Sucesso'): void {
    this.show({ message, title, variant: 'success' });
  }

  error(message: string, title = 'Erro'): void {
    this.show({ message, title, variant: 'error', durationMs: 7000 });
  }

  warning(message: string, title = 'Atencao'): void {
    this.show({ message, title, variant: 'warning' });
  }

  info(message: string, title = 'Info'): void {
    this.show({ message, title, variant: 'info' });
  }

  dismiss(id: number): void {
    const timer = this.timers.get(id);
    if (timer) {
      window.clearTimeout(timer);
      this.timers.delete(id);
    }

    const target = this.state().find((item) => item.id === id);
    if (!target || target.closing) {
      return;
    }

    this.state.update((items) =>
      items.map((item) =>
        item.id === id
          ? {
              ...item,
              closing: true
            }
          : item
      )
    );

    const removeTimer = window.setTimeout(() => {
      this.state.update((items) => items.filter((item) => item.id !== id));
      this.removeTimers.delete(id);
    }, this.leaveAnimationMs);

    this.removeTimers.set(id, removeTimer);
  }

  private show(input: Partial<ToastMessage> & { message: string }): void {
    const id = ++this.sequence;
    const toast: ToastMessage = {
      id,
      message: input.message,
      title: input.title,
      variant: input.variant ?? 'info',
      durationMs: input.durationMs ?? 4000,
      closing: false
    };

    this.state.update((items) => [...items.slice(-3), toast]);

    const timer = window.setTimeout(() => this.dismiss(id), toast.durationMs);
    this.timers.set(id, timer);
  }
}
