export type TemplateHandler<T extends string = string> = (
  typeKey: T,
  element: HTMLElement,
  payload: any,
  selector: any
) => void | Promise<void>;

export class TemplateRegistry {
  // 💡 USULAN 1 AGENT: Gunakan tipe data kontrak yang kaku agar kebal dari sabotase memori
  static #templates = new Map<string, TemplateHandler<any>>();

  /**
   * Mendaftarkan fungsi template dari luar (Theme / Plugin API)
   */
  public static register(themeId: string, selectorKey: string, handler: TemplateHandler<any>): void {
    const primaryKey = `~${themeId}:${selectorKey}`;
    this.#templates.set(primaryKey, handler);
    console.log(`Registering Theme: ${primaryKey}`);
  }

  /**
   * Mengosongkan memori token agar terbebas dari kebocoran memori (deactivate loops)
   */
  public static unregister(themeId: string, selectorKey: string): void {
    const primaryKey = `~${themeId}:${selectorKey}`;
    this.#templates.delete(primaryKey);
    console.log(`[TemplateRegistry] Wiped out cache token: ${primaryKey}`);
  }

  /**
   * 🧙‍♂️ THE DYNAMIC CASCADE RESOLVER 
   * Menjaga Inversion of Control: Builder tidak peduli siapa yang merender!
   */
  public static resolve(themeId: string, selectorKey: string, defaultHandler: TemplateHandler<any> | null): TemplateHandler<any> | null {
    const primaryKey = `~${themeId}:${selectorKey}`;

    if (!this.#templates.has(primaryKey)) {
      this.#templates.set(primaryKey, defaultHandler!);
    } else {
      // console.log(`[Cascade Registry] Custom Theme Override found for: ${primaryKey}`);
      return this.#templates.get(primaryKey)!;
    }

    // Fallback terakhir: Kembalikan fungsi bawaan internal milik Builder itu sendiri
    return defaultHandler;
  }

}
