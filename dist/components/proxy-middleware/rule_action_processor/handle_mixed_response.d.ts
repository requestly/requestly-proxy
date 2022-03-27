export default handleMixedResponse;
declare function handleMixedResponse(ctx: any, destinationUrl: any): Promise<{
    status: boolean;
    response_data: {
        headers: {
            "Cache-Control": string;
        };
        status_code: number;
        body: any;
    };
} | {
    status: boolean;
    response_data?: undefined;
}>;
