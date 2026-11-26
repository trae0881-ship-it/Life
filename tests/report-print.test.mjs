import test from "node:test";
import assert from "node:assert/strict";
import { printReport } from "../src/presentation/report-print.ts";

function attributeElement(initial = {}) {
  const attributes = new Map(Object.entries(initial));
  return {
    dataset: {},
    children: [],
    parentNode: null,
    getAttribute(name) {
      return attributes.get(name) ?? null;
    },
    setAttribute(name, value) {
      attributes.set(name, value);
    },
    removeAttribute(name) {
      attributes.delete(name);
    },
    hasAttribute(name) {
      return attributes.has(name);
    },
    querySelectorAll() {
      return this.details ?? [];
    },
    insertBefore(node, reference) {
      if (node.parentNode) {
        const oldIndex = node.parentNode.children.indexOf(node);
        if (oldIndex >= 0) node.parentNode.children.splice(oldIndex, 1);
      }
      const index = this.children.indexOf(reference);
      this.children.splice(index < 0 ? this.children.length : index, 0, node);
      node.parentNode = this;
      return node;
    },
    appendChild(node) {
      return this.insertBefore(node, null);
    },
  };
}

test("report printing opens details temporarily and restores the page afterward", () => {
  const originalDocument = globalThis.document;
  const originalWindow = globalThis.window;
  const body = attributeElement();
  const parent = attributeElement();
  const target = attributeElement();
  parent.appendChild(target);
  const details = [{ open: false }, { open: true }];
  target.details = details;
  globalThis.document = {
    body,
    getElementById: () => target,
    createComment() {
      return {
        parentNode: null,
        remove() {
          if (!this.parentNode) return;
          const index = this.parentNode.children.indexOf(this);
          if (index >= 0) this.parentNode.children.splice(index, 1);
          this.parentNode = null;
        },
      };
    },
  };
  let printCalls = 0;
  globalThis.window = {
    requestAnimationFrame: (callback) => callback(),
    print: () => {
      printCalls += 1;
      assert.equal(body.getAttribute("data-report-print"), "active");
      assert.equal(target.getAttribute("data-report-print-target"), "active");
      assert.equal(target.parentNode, body);
      assert.deepEqual(details.map((item) => item.open), [true, true]);
    },
  };

  try {
    printReport("report");
    assert.equal(printCalls, 1);
    assert.equal(body.hasAttribute("data-report-print"), false);
    assert.equal(target.hasAttribute("data-report-print-target"), false);
    assert.equal(target.parentNode, parent);
    assert.deepEqual(parent.children, [target]);
    assert.deepEqual(details.map((item) => item.open), [false, true]);
  } finally {
    if (originalDocument === undefined) delete globalThis.document;
    else globalThis.document = originalDocument;
    if (originalWindow === undefined) delete globalThis.window;
    else globalThis.window = originalWindow;
  }
});

test("report printing reports a missing report section", () => {
  const originalDocument = globalThis.document;
  globalThis.document = {
    body: attributeElement(),
    getElementById: () => null,
    createComment: () => { throw new Error("should not create a placeholder"); },
  };

  try {
    assert.throws(() => printReport("missing"), /Report section "missing" was not found/);
  } finally {
    if (originalDocument === undefined) delete globalThis.document;
    else globalThis.document = originalDocument;
  }
});
