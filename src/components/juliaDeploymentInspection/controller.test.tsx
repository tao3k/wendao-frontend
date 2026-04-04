import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useJuliaDeploymentInspectionController } from "./controller";

function TestHarness(props: {
  locale: "en" | "zh";
  onCopyToml?: () => Promise<void>;
  onDownloadJson?: () => void;
}) {
  const controller = useJuliaDeploymentInspectionController(props);

  return (
    <div>
      <button
        type="button"
        onClick={() => {
          void controller.handleCopyToml();
        }}
      >
        copy
      </button>
      <button type="button" onClick={controller.handleDownloadJson}>
        download
      </button>
      {controller.actionState ? <span>{controller.actionState.message}</span> : null}
    </div>
  );
}

describe("useJuliaDeploymentInspectionController", () => {
  it("reports success feedback for copy and download actions", async () => {
    const onCopyToml = vi.fn().mockResolvedValue(undefined);
    const onDownloadJson = vi.fn();

    render(<TestHarness locale="en" onCopyToml={onCopyToml} onDownloadJson={onDownloadJson} />);

    fireEvent.click(screen.getByRole("button", { name: "copy" }));
    expect(onCopyToml).toHaveBeenCalledTimes(1);
    expect(await screen.findByText("TOML copied")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "download" }));
    expect(onDownloadJson).toHaveBeenCalledTimes(1);
    expect(screen.getByText("JSON downloaded")).toBeInTheDocument();
  });
});
