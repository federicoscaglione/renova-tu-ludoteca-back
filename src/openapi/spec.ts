import swaggerJsdoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: "3.0.0",
    info: { title: "Renova Ludoteca API", version: "1.0.0" },
    servers: [{ url: "/api", description: "API base" }],
    components: {
      securitySchemes: {
        bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
      },
    },
  },
  apis: ["./src/routes/*.ts", "./src/controllers/*.ts"],
};

export const openApiSpec = swaggerJsdoc(options);
export const openApiUi = swaggerUi.serve;
export const openApiUiSetup = swaggerUi.setup(openApiSpec);
