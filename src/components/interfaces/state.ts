export default interface IInitialState extends Record<string, any> {
    sharedState?: Record<string, any>;
    variables?: Record<string, any>;
}