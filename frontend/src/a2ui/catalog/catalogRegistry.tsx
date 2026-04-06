import { type ReactElement } from 'react';
import { TextComponent } from './components/TextComponent';
import { CardComponent } from './components/CardComponent';
import { ButtonComponent } from './components/ButtonComponent';
import { BadgeComponent } from './components/BadgeComponent';
import { SourceListComponent } from './components/SourceListComponent';

/** Renders a child component by its A2UI component ID. */
export type RenderChild = (id: string) => ReactElement | null;

/**
 * A renderer function called by ComponentHost to render a catalog component.
 * `props` are the raw component properties from the A2UI message.
 * `renderChild` lets container components (e.g. Card) render nested children by ID.
 */
export type CatalogRenderer = (
  props: Record<string, unknown>,
  renderChild: RenderChild
) => ReactElement | null;

/**
 * Maps A2UI component type names (as sent by the agent) to their React renderers.
 * ComponentHost looks up this map using ComponentModel.type.
 */
export const catalogComponentMap: Record<string, CatalogRenderer> = {
  Text: (props) => (
    <TextComponent text={props.text} usageHint={props.usageHint} />
  ),

  Card: (props, renderChild) => (
    <CardComponent
      title={props.title}
      childIds={Array.isArray(props.childIds) ? (props.childIds as string[]) : []}
      renderChild={renderChild}
    />
  ),

  Button: (props) => (
    <ButtonComponent label={props.label} variant={props.variant} />
  ),

  Badge: (props) => (
    <BadgeComponent label={props.label} variant={props.variant} />
  ),

  SourceList: (props) => (
    <SourceListComponent sources={props.sources} />
  ),
};
