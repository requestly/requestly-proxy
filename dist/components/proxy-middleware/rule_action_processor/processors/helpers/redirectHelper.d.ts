export function handleMixedResponse(ctx: any, destinationUrl: any): Promise<{
    status: boolean;
    response_data: {
        headers: any;
        status_code: any;
        body: any;
    };
} | {
    status: boolean;
    response_data?: undefined;
}>;
export function handleServerSideRedirect(ctx: any, destinationUrl: any): Promise<{
    status: boolean;
    response_data: {
        headers: any;
        status_code: any;
        body: any;
    };
} | {
    status: boolean;
    response_data?: undefined;
}>;
