/* eslint-disable @typescript-eslint/no-explicit-any */

type SpicetifyTrackItem = {
  type?: string;
  uri?: string;
  name?: string;
  metadata?: Record<string, string>;
  album?: { name?: string };
  artists?: { name?: string }[];
  images?: { url?: string }[];
};

declare const Spicetify: {
  React: typeof import("react");
  ReactDOM: typeof import("react-dom/client");
  LocalStorage: {
    get(key: string): string | null;
    set(key: string, value: string): void;
  };
  Player: {
    data?: { item?: SpicetifyTrackItem } | null;
    addEventListener(type: string, callback: () => void): void;
    removeEventListener(type: string, callback: () => void): void;
  };
  Panel?: {
    registerPanel(props: { label: string; children: import("react").ReactNode }): {
      toggle(): Promise<void>;
    };
  };
  Topbar?: {
    Button: new (
      label: string,
      icon: string,
      onClick: () => void,
      disabled?: boolean,
      isRight?: boolean,
    ) => object;
  };
  showNotification(message: string, isError?: boolean): void;
};

declare namespace JSX {
  type Element = import("react").ReactElement;
  interface IntrinsicAttributes {
    key?: string | number;
  }
  interface IntrinsicElements {
    [elementName: string]: any;
  }
}
