using Bramhand.Api.DTOs;
using Microsoft.AspNetCore.SignalR;

namespace Bramhand.Api.Hubs;

public class RestaurantHub : Hub
{
    public async Task JoinFloor(string floorId)
        => await Groups.AddToGroupAsync(Context.ConnectionId, $"floor-{floorId}");

    public async Task JoinKitchen()
        => await Groups.AddToGroupAsync(Context.ConnectionId, "kitchen");
}

public static class RestaurantHubEvents
{
    public const string TablesUpdated = "tablesUpdated";
    public const string OrderUpdated = "orderUpdated";
    public const string KotCreated = "kotCreated";
    public const string ItemReady = "itemReady";
}

public interface IRealtimeService
{
    Task TablesUpdatedAsync();
    Task OrderUpdatedAsync(OrderDto order);
    Task KotCreatedAsync(object kotPayload);
}

public class RealtimeService(IHubContext<RestaurantHub> hub) : IRealtimeService
{
    public Task TablesUpdatedAsync()
        => hub.Clients.All.SendAsync(RestaurantHubEvents.TablesUpdated);

    public Task OrderUpdatedAsync(OrderDto order)
        => hub.Clients.All.SendAsync(RestaurantHubEvents.OrderUpdated, order);

    public Task KotCreatedAsync(object kotPayload)
        => hub.Clients.Group("kitchen").SendAsync(RestaurantHubEvents.KotCreated, kotPayload);
}
