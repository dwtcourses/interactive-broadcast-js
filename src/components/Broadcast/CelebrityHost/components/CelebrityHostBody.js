// @flow
import React from 'react';
import classNames from 'classnames';
import VideoHolder from '../../../Common/VideoHolder';
import './CelebrityHostBody.css';
import defaultImg from '../../../../images/TAB_VIDEO_PREVIEW_LS.jpg';

const userTypes: ParticipantType[] = ['host', 'celebrity', 'fan'];

type Props = {
  status: EventStatus,
  endImage?: EventImage,
  participants: null | BroadcastParticipants, // publishOnly => null
  userType: 'host' | 'celebrity',
  eventStarted: boolean,
  startEvent: Unit
};
const CelebrityHostBody = (props: Props): ReactComponent => {
  const { status, endImage, participants, userType, eventStarted, startEvent } = props;
  const isClosed = status === 'closed';
  const imgClass = classNames('CelebrityHostBody', { withStreams: !isClosed, notStarted: !eventStarted  });
  const endImageUrl = endImage ? endImage.url : null;
  return (
    <div className={imgClass}>
      { isClosed &&
        <div className="closeImageHolder">
          <img src={endImageUrl || defaultImg} alt="event ended" className="closeImage" />
        </div>
      }
      { !isClosed && !eventStarted && <button className="btn action green " onClick={startEvent}>JOIN SESSION</button> }
      { !isClosed && userTypes.map((type: ParticipantType): ReactComponent =>
        <VideoHolder
          key={`videoStream${type}`}
          connected={participants && participants[type] ? participants[type].connected : false}
          isMe={userType === type}
          userType={type}
        />)}
      <div id="videoproducer" className="producerContainer" />
    </div>
  );
};

export default CelebrityHostBody;
