/** Primitive values that can appear in a JSON/XML manifest tree. */
type JsonPrimitive = string | number | boolean | null;

/** Recursive JSON value type used for manifest serialisation. */
type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };

/** Parsed XML node result — either a leaf string or a nested record. */
type XmlNode = string | XmlNodeObject;
interface XmlNodeObject {
  [key: string]: XmlNode | XmlNode[];
}

export function jsonToXml(obj: JsonValue, rootName = "manifest"): string {
  const escape = (str: string) =>
    String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");

  const convert = (value: JsonValue, name: string): string => {
    if (value === null || value === undefined) {
      return `<${name} />`;
    }

    if (typeof value !== "object") {
      return `<${name}>${escape(String(value))}</${name}>`;
    }

    if (Array.isArray(value)) {
      return value.map((item) => convert(item as JsonValue, name.replace(/s$/, ""))).join("\n");
    }

    const children = Object.entries(value as Record<string, JsonValue>)
      .map(([key, child]) => convert(child, key))
      .join("\n");

    return `<${name}>\n${children}\n</${name}>`;
  };

  return `<?xml version="1.0" encoding="UTF-8"?>\n${convert(obj, rootName)}`;
}

export function xmlToJson(xml: string): XmlNode {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xml, "text/xml");

  if (doc.getElementsByTagName("parsererror").length > 0) {
    throw new Error("Invalid XML");
  }

  const convert = (node: Element): XmlNode => {
    const obj: XmlNodeObject = {};

    if (node.children.length === 0) {
      return node.textContent || "";
    }

    for (const child of node.children) {
      const key = child.tagName;
      const value = convert(child);

      const existing = obj[key];
      if (existing !== undefined) {
        if (!Array.isArray(existing)) {
          obj[key] = [existing, value];
        } else {
          existing.push(value);
        }
      } else {
        obj[key] = value;
      }
    }

    return obj;
  };

  return convert(doc.documentElement);
}
