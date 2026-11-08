/* ==========================================================================
   __TITLE__ (.__KEBAB__)
   Scoped to this component's own classes. Colours, spacing and radii come from
   the `--app-*` tokens so every theme can retune it without touching this file.
   ========================================================================== */

.__KEBAB__-widget {
  display: block;
}

.__KEBAB__ {
  display: grid;
  gap: var(--app-margin-component);
}

.__KEBAB__-item {
  display: grid;
  gap: 0.25rem;
  padding: var(--app-padding-component);
  background: var(--app-surface-background-color);
  border: 1px solid var(--app-border-color);
  border-radius: var(--app-component-border-radius);
}

.__KEBAB__-label {
  font-weight: 700;
  color: var(--app-text-heading-color);
}

.__KEBAB__-desc {
  margin: 0;
  font-size: 0.925rem;
  line-height: 1.6;
  color: var(--app-text-accent-color);
}

/* Set from template() when config.emphasis is true. */
.__KEBAB__-widget.is-emphasis .__KEBAB__-item {
  border-color: var(--app-primary-color);
  box-shadow: var(--app-shadow-soft);
}
