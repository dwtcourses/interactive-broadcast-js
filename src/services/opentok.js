// @flow
import Core from 'opentok-accelerator-core';
import R from 'ramda';

let coreStage;
let coreBackstage;

const otEvents = [
  'subscribeToCamera',
  'unsubscribeFromCamera',
];

const otStreamEvents = [
  'streamCreated',
  'streamDestroyed',
];

const coreOptions = (credentials: SessionCredentials, publisherRole: UserRole, autoSubscribe: boolean = true): CoreOptions => ({
  credentials,
  packages: ['textChat'],
  streamContainers(pubSub: PubSub, source: VideoType, data: { userType: UserRole }): string {
    return `#video${pubSub === 'subscriber' ? data.userType : publisherRole}`;
  },
  communication: {
    autoSubscribe,
    callProperties: {
      fitMode: 'contain',
    },
  },
  controlsContainer: null,
});

const unsubscribeAll: Unit = (stage: boolean): object => {
  const core = stage ? coreStage : coreBackstage;
  const subscribers = core.internalState.subscribers.camera;
  Object.values(subscribers).forEach(core.communication.unsubscribe);
  return core.internalState.getPubSub();
};

const subscribeAll: Unit = (stage: boolean): object => {
  const core = stage ? coreStage : coreBackstage;
  const streams = core.internalState.getStreams();
  Object.values(streams).forEach(core.communication.subscribe);
  return core.internalState.getPubSub();
};

const connect = async ({ apiKey, backstageToken, stageToken, stageSessionId, sessionId }: UserCredentials, userType: UserType, listeners: Listeners): AsyncVoid => {
  const stageCredentials = {
    apiKey,
    sessionId: stageSessionId,
    token: stageToken,
  };
  const backstageCredentials = {
    apiKey,
    sessionId,
    token: backstageToken,
  };

  const { onStateChanged, onStreamChanged, onSignal } = listeners;
  const isCelebHost = R.equals('celebrity', userType) || R.equals('host', userType);
  const isFan = R.equals('fan', userType);

  // Connect the listeners with the OTCore object
  const connectListeners = (otCore: Core) => {
    // Assign listener for state changes
    otEvents.forEach((e: Event): void => otCore.on(e, ({ publishers, subscribers, meta }: State) => {
      onStateChanged({ publishers, subscribers, meta });
    }));

    // Assign listener for stream changes
    otStreamEvents.forEach((e: Event): void => otCore.on(e, ({ stream }: Stream) => {
      e === 'streamCreated' && !isFan && coreStage.communication.subscribe(stream);
      const connectionData = JSON.parse(stream.connection.data);
      onStreamChanged(connectionData.userType, e, stream);
    }));

    // Assign listener for signal changes
    otCore.on('signal', onSignal);
  };

  try {
    // Core and SDK Wrapper should have 'connected' properties returned by state
    // They should also wrap disconnect in try/catch in case a user tries to disconnect before connecting
    if (stageToken) {
      coreStage = new Core(coreOptions(stageCredentials, userType, false));
      connectListeners(coreStage);
    }

    if (backstageToken) {
      coreBackstage = new Core(coreOptions(backstageCredentials, userType, false));
      connectListeners(coreBackstage);
    }

    await Promise.all([coreStage && coreStage.connect(), coreBackstage && coreBackstage.connect()]);

    // Start subscribing and publishing
    isCelebHost && coreStage.communication.publish();

    return;
  } catch (error) {
    throw error;
  }
};

const disconnect: Unit = () => {
  try {
    coreStage && coreStage.off();
    coreStage && coreStage.disconnect();
    coreBackstage && coreBackstage.off();
    coreBackstage && coreBackstage.disconnect();
  } catch (error) {
    console.log('error disconnect', error);
  }
};

const getStreamByUserType: Unit = (userType: string, core: Core): Stream => {
  let stream;
  const printKeyConcatValue = (value: object) => {
    const connectionData = JSON.parse(R.path(['connection', 'data'], value));
    if (connectionData.userType === userType) {
      stream = value;
    }
  };
  R.forEachObjIndexed(printKeyConcatValue, core.internalState.getStreams());
  return stream;
};

const changeVolume: Unit = (userType: string, volume: int, stage: boolean) => {
  const core = stage ? coreStage : coreBackstage;
  const stream = getStreamByUserType(userType, core);
  if (stream) {
    const subscribers = core.getSubscribersForStream(stream);
    subscribers.forEach((subscriber: Subscriber): void => subscriber.setAudioVolume(volume));
  }
};

const signal: Unit = ({ type, signalData, to }: Signal, stage: boolean) => {
  try {
    const core = stage ? coreStage : coreBackstage;
    core.signal(type, signalData, to);
  } catch (error) {
    console.log('error coreStage', error);
  }
};

const toggleLocalVideo: Unit = (enable: booelan): void => coreStage.toggleLocalVideo(enable);
const toggleLocalAudio: Unit = (enable: booelan): void => coreStage.toggleLocalAudio(enable);

module.exports = {
  connect,
  disconnect,
  signal,
  toggleLocalVideo,
  toggleLocalAudio,
  changeVolume,
  unsubscribeAll,
  subscribeAll,
};
