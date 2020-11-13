import React, { useEffect, useState, useContext } from 'react';
import { Form, Field } from 'react-final-form';
import { validateEmail } from '../../utils';

import { TextInputWrapped } from '../TextInput';
import FormSection from '../FormSection';
import { Checkbox } from '../Checkbox';
import { SignatureCountSlider } from '../SignatureCountSlider';
import { CTAButtonContainer, CTAButton } from '../../Layout/CTAButton';
import FormWrapper from '../FormWrapper';
import SignUpFeedbackMessage from '../SignUpFeedbackMessage';
import s from './style.module.less';
import { RequestLoginCode } from '../../Login/RequestLoginCode';
import { EnterLoginCode } from '../../Login/EnterLoginCode';
import AuthInfo from '../../AuthInfo';
import { FinallyMessage } from '../FinallyMessage';
import { useSignUp } from '../../../hooks/authentication';
import { useCreatePledge } from '../../../hooks/api/pledges/create';
import { useUpdatePledge } from '../../../hooks/api/pledges/update';
import { useUpdateUser } from '../../../hooks/api/users/update';
import { AuthContext } from '../../../context/Authentication';

export default ({ className, pledgeId }) => {
  return (
    <div className={className}>
      <div className={s.jumpToAnchorWrapper}>
        <div className={s.jumpToAnchor} id="pledge" />
      </div>
      <SignaturePledge pledgeId={pledgeId} />
    </div>
  );
};

const SignaturePledge = ({ pledgeId }) => {
  const [signUpState, signUp] = useSignUp();
  const [createPledgeState, createPledge] = useCreatePledge();
  const [updatePledgeState, updatePledge] = useUpdatePledge();
  const [updateUserState, updateUser] = useUpdateUser();
  const [pledge, setPledgeLocally] = useState({});
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const { isAuthenticated, userId, customUserData: userData } = useContext(
    AuthContext
  );

  // After signup process is done we can save the pledge
  useEffect(() => {
    if (signUpState === 'success') {
      createPledge(pledge);
    }
  }, [signUpState]);

  useEffect(() => {
    if (isAuthenticated && hasSubmitted) {
      updatePledge(pledge);
      updateUser(pledge);
    }
  }, [isAuthenticated, hasSubmitted]);

  if (createPledgeState || updatePledgeState) {
    return (
      <SignUpFeedbackMessage
        state={
          createPledgeState ||
          (updateUserState === 'error' ? updateUserState : updatePledgeState)
        }
        trackingId={pledgeId}
        trackingCategory="Pledge"
      />
    );
  }

  if (signUpState === 'userExists') {
    return <EnterLoginCode />;
  }

  if (userId && !isAuthenticated) {
    return <RequestLoginCode buttonText="Ich bin dabei!" />;
  }

  if (isAuthenticated && userData && pledgeWasAlreadyMade(userData, pledgeId)) {
    return (
      <FinallyMessage preventScrolling={true}>
        <p>
          Klasse, du hast dich bereits für {pledgeIdMap[pledgeId].state}{' '}
          angemeldet. Wir informieren dich, sobald es losgeht.
        </p>
        <p>
          <AuthInfo />
        </p>
      </FinallyMessage>
    );
  }

  return (
    <Form
      onSubmit={e => {
        e.pledgeId = pledgeId;
        setHasSubmitted(true);
        setPledgeLocally(e);
        if (!isAuthenticated) {
          signUp(e);
        }
      }}
      initialValues={{
        signatureCount: 1,
        username: userId !== undefined && userData ? userData.username : '',
        zipCode: userId !== undefined && userData ? userData.zipCode : '',
      }}
      validate={values => validate(values, isAuthenticated)}
      render={({ handleSubmit }) => {
        return (
          <FormWrapper className={s.formWrapperWithSlider}>
            <form onSubmit={handleSubmit}>
              {!isAuthenticated ? (
                <FormSection heading={'Wer bist du?'}>
                  <Field
                    name="email"
                    label="E-Mail"
                    description="Pflichtfeld"
                    placeholder="E-Mail"
                    type="email"
                    component={TextInputWrapped}
                  ></Field>
                  <Field
                    name="username"
                    label="Mit diesem Namen möchte ich angesprochen werden"
                    placeholder="Name"
                    type="text"
                    component={TextInputWrapped}
                  ></Field>
                  <Field
                    name="zipCode"
                    label="Postleitzahl"
                    description="Pflichtfeld"
                    placeholder="12345"
                    type="number"
                    component={TextInputWrapped}
                  ></Field>
                </FormSection>
              ) : (
                <FinallyMessage
                  className={s.alreadyAuthorizedMessage}
                  preventScrolling={true}
                >
                  <p>
                    <AuthInfo />
                  </p>
                </FinallyMessage>
              )}

              <FormSection heading={pledgeIdMap[pledgeId].signatureCountLabel}>
                <Field
                  name="signatureCount"
                  labelHidden={pledgeIdMap[pledgeId].signatureCountLabel}
                  component={SignatureCountSlider}
                  type="range"
                  min={1}
                  max={30}
                />
              </FormSection>

              <FormSection>
                {(!isAuthenticated ||
                  (isAuthenticated && !userData?.newsletterConsent?.value)) && (
                  <Field
                    name="newsletterConsent"
                    label={
                      <>
                        Schreibt mir, wenn die Unterschriftslisten da sind und
                        haltet mich über alle weiteren Kampagnenschritte auf dem
                        Laufenden.
                      </>
                    }
                    type="checkbox"
                    component={Checkbox}
                  ></Field>
                )}
                {!isAuthenticated && (
                  <Field
                    name="privacyConsent"
                    label={
                      <>
                        Ich stimme zu, dass meine eingegebenen Daten gespeichert
                        werden.
                      </>
                    }
                    type="checkbox"
                    component={Checkbox}
                  ></Field>
                )}
              </FormSection>

              <CTAButtonContainer illustration="POINT_LEFT">
                <CTAButton type="submit">
                  Ich bin dabei, wenn’s losgeht!
                </CTAButton>
              </CTAButtonContainer>
            </form>
          </FormWrapper>
        );
      }}
    ></Form>
  );
};

const validate = (values, isAuthenticated) => {
  const errors = {};

  // Needs to be dependent on, if user is authenticated
  // If user is authenticated, the checkbox was not shown
  if (!values.privacyConsent && !isAuthenticated) {
    errors.privacyConsent = 'Wir benötigen dein Einverständnis';
  }

  if (!values.zipCode) {
    errors.zipCode =
      'Wir benötigen deine Postleitzahl, um dich dem korrekten Bundesland zuzuordnen';
  }

  if (values.email && values.email.includes('+')) {
    errors.email = 'Zurzeit unterstützen wir kein + in E-Mails';
  }

  if (values.email && !validateEmail(values.email)) {
    errors.email = 'Wir benötigen eine valide E-Mail Adresse';
  }

  return errors;
};

const pledgeWasAlreadyMade = (user, pledgeId) => {
  return (
    user.pledges &&
    user.pledges.find(pledge => pledge.campaign.code === pledgeId)
  );
};

const pledgeIdMap = {
  'brandenburg-1': {
    signatureCountLabel:
      'Wie viele Unterschriften von anderen Menschen in Brandenburg kannst du noch mit einsammeln?',
    state: 'Brandenburg',
  },
  'schleswig-holstein-1': {
    signatureCountLabel:
      'Wie viele Unterschriften von anderen Menschen in Schleswig-Holstein kannst du noch mit einsammeln?',
    state: 'Schleswig-Holstein',
  },
  'hamburg-1': {
    signatureCountLabel:
      'Wie viele Unterschriften von anderen Menschen in Hamburg kannst du noch mit einsammeln?',
    state: 'Hamburg',
  },
  'bremen-1': {
    signatureCountLabel:
      'Wie viele Unterschriften von anderen Menschen in Bremen kannst du noch mit einsammeln?',
    state: 'Bremen',
  },
  'berlin-1': {
    signatureCountLabel:
      'Wie viele Unterschriften von anderen Menschen in Berlin kannst du noch mit einsammeln?',
    state: 'Berlin',
  },
};
