export function printReport(elementId: string): void {
  const target = document.getElementById(elementId);
  if (!target) throw new Error(`Report section "${elementId}" was not found.`);
  const originalParent = target.parentNode;
  if (!originalParent) throw new Error(`Report section "${elementId}" is not attached to the document.`);
  if (document.body.dataset.reportPrint === "active") {
    throw new Error("Another report is already being prepared for printing.");
  }

  const placeholder = document.createComment("report-print-placeholder");
  const previousTargetValue = target.getAttribute("data-report-print-target");
  const previousBodyValue = document.body.getAttribute("data-report-print");
  const details = Array.from(target.querySelectorAll("details"), (element) => ({
    element,
    wasOpen: element.open,
  }));
  let cleaned = false;

  const cleanup = () => {
    if (cleaned) return;
    cleaned = true;
    if (placeholder.parentNode) placeholder.parentNode.insertBefore(target, placeholder);
    placeholder.remove();
    if (previousTargetValue === null) target.removeAttribute("data-report-print-target");
    else target.setAttribute("data-report-print-target", previousTargetValue);
    if (previousBodyValue === null) document.body.removeAttribute("data-report-print");
    else document.body.setAttribute("data-report-print", previousBodyValue);
    details.forEach(({ element, wasOpen }) => { element.open = wasOpen; });
  };

  target.setAttribute("data-report-print-target", "active");
  document.body.setAttribute("data-report-print", "active");
  originalParent.insertBefore(placeholder, target);
  document.body.appendChild(target);
  details.forEach(({ element }) => { element.open = true; });

  window.requestAnimationFrame(() => {
    try {
      window.print();
    } finally {
      cleanup();
    }
  });
}
