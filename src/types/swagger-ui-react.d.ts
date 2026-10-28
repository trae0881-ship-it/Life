declare module "swagger-ui-react" {
  import type { ComponentType } from "react";

  type SwaggerUiProps = {
    url?: string;
    withCredentials?: boolean;
    supportedSubmitMethods?: string[];
    docExpansion?: "list" | "full" | "none";
    displayRequestDuration?: boolean;
  };

  const SwaggerUI: ComponentType<SwaggerUiProps>;
  export default SwaggerUI;
}
