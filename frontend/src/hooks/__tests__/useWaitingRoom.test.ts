describe('useWaitingRoom', () => {
    it.todo('initializes waitingRoomData from location state when available');
    it.todo('loads waitingRoomData from session storage when location state is absent');
    it.todo('ignores invalid session storage data and leaves waitingRoomData null');
    it.todo('updates state when loadData is called with a valid waiting room object');
    it.todo('authenticates the socket and emits wait_for_game when waitingRoomData is set');
    it.todo('persists waitingRoomData to session storage and auth context when it changes');
    it.todo('avoids emitting wait_for_game more than once per mount');
});
